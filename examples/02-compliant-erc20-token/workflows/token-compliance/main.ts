import {
	bytesToHex,
	consensusIdenticalAggregation,
	cre,
	encodeCallMsg,
	getNetwork,
	type HTTPPayload,
	hexToBase64,
	LATEST_BLOCK_NUMBER,
	Runner,
	type Runtime,
	TxStatus,
} from "@chainlink/cre-sdk";
import {
	type Address,
	decodeFunctionResult,
	encodeAbiParameters,
	encodeFunctionData,
	zeroAddress,
} from "viem";
import { z } from "zod";
import { CompliantToken } from "./abi/CompliantToken";
import { type Allowlist, fetchAllowlist } from "./lib/spreadsheet";

const ConfigSchema = z.object({
	authorizedEVMAddress: z.string().min(1, "Authorized EVM address is required"),
	spreadsheetId: z.string().min(1, "Spreadsheet ID is required"),
	evms: z.array(
		z.object({
			tokenAddress: z
				.string()
				.regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
			chainSelectorName: z.string().min(1, "Chain selector name is required"),
			gasLimit: z.string(),
		}),
	),
});

type Config = z.infer<typeof ConfigSchema>;

type AllowlistDelta = {
	toAdd: Address[];
	toRemove: Address[];
};

const computeAllowlistDelta = (
	spreadsheet: Set<Address>,
	contract: Set<Address>,
): AllowlistDelta => ({
	toAdd: [...spreadsheet].filter((addr) => !contract.has(addr)),
	toRemove: [...contract].filter((addr) => !spreadsheet.has(addr)),
});

const getSpreadsheetAllowlist = (runtime: Runtime<Config>): Set<Address> => {
	const httpClient = new cre.capabilities.HTTPClient();
	const spreadsheetId = runtime.config.spreadsheetId;
	const apiKey = runtime.getSecret({ id: "GOOGLE_API_KEY" }).result().value;

	const result = httpClient
		.sendRequest(
			runtime,
			fetchAllowlist,
			consensusIdenticalAggregation<Allowlist>(),
		)(spreadsheetId, apiKey)
		.result();

	return new Set(result.addresses.map((a) => a.toLowerCase() as Address));
};

const getContractAllowlist = (runtime: Runtime<Config>): Set<Address> => {
	const evmConfig = runtime.config.evms[0];
	const network = getNetwork({
		chainFamily: "evm",
		chainSelectorName: evmConfig.chainSelectorName,
		isTestnet: true,
	});

	if (!network) {
		throw new Error(`Network not found: ${evmConfig.chainSelectorName}`);
	}

	const evmClient = new cre.capabilities.EVMClient(
		network.chainSelector.selector,
	);

	const result = evmClient
		.callContract(runtime, {
			call: encodeCallMsg({
				from: zeroAddress,
				to: evmConfig.tokenAddress as Address,
				data: encodeFunctionData({
					abi: CompliantToken,
					functionName: "allowlist",
				}),
			}),
			blockNumber: LATEST_BLOCK_NUMBER,
		})
		.result();

	const addresses = decodeFunctionResult({
		abi: CompliantToken,
		functionName: "allowlist",
		data: bytesToHex(result.data),
	});

	return new Set(addresses.map((a) => a.toLowerCase() as Address));
};

const updateContractAllowlist = (
	runtime: Runtime<Config>,
	delta: AllowlistDelta,
): string => {
	const evmConfig = runtime.config.evms[0];
	const network = getNetwork({
		chainFamily: "evm",
		chainSelectorName: evmConfig.chainSelectorName,
		isTestnet: true,
	});

	if (!network) {
		throw new Error(`Network not found: ${evmConfig.chainSelectorName}`);
	}

	const evmClient = new cre.capabilities.EVMClient(
		network.chainSelector.selector,
	);

	// Encode (toRemove[], toAdd[]) for _processReport
	const encodedPayload = encodeAbiParameters(
		[{ type: "address[]" }, { type: "address[]" }],
		[delta.toRemove, delta.toAdd],
	);

	// Generate signed report
	const reportResponse = runtime
		.report({
			encodedPayload: hexToBase64(encodedPayload),
			encoderName: "evm",
			signingAlgo: "ecdsa",
			hashingAlgo: "keccak256",
		})
		.result();

	runtime.log(`Publishing report to ${evmConfig.tokenAddress}`);

	const updateResult = evmClient
		.writeReport(runtime, {
			receiver: evmConfig.tokenAddress,
			report: reportResponse,
			gasConfig: {
				gasLimit: evmConfig.gasLimit,
			},
		})
		.result();

	if (updateResult.txStatus !== TxStatus.SUCCESS) {
		throw new Error(
			`Failed to write report: ${updateResult.errorMessage || updateResult.txStatus}`,
		);
	}

	const txHash = bytesToHex(updateResult.txHash || new Uint8Array(32));
	runtime.log(`Transaction succeeded: ${txHash}`);

	return txHash;
};

const onHttpTrigger = (runtime: Runtime<Config>, _: HTTPPayload): string => {
	runtime.log("Workflow triggered. Fetching allowlist...");

	// Step 1: Read current allowlist from spreadsheet
	const spreadsheetAllowlist = getSpreadsheetAllowlist(runtime);
	runtime.log(
		`Fetched ${spreadsheetAllowlist.size} allowed addresses from spreadsheet`,
	);

	// Step 2: Read current allowlist from contract
	const contractAllowlist = getContractAllowlist(runtime);
	runtime.log(
		`Fetched ${contractAllowlist.size} allowed addresses from contract`,
	);

	// Step 3: Compute delta between spreadsheet and contract
	const delta = computeAllowlistDelta(spreadsheetAllowlist, contractAllowlist);
	runtime.log(
		`Delta: ${delta.toAdd.length} to add, ${delta.toRemove.length} to remove`,
	);

	// Step 4: Skip if no changes needed
	if (delta.toAdd.length === 0 && delta.toRemove.length === 0) {
		runtime.log("No changes needed, skipping report");
		return "no-op";
	}

	// Step 5: Update contract allowlist
	return updateContractAllowlist(runtime, delta);
};

const initWorkflow = (config: Config) => {
	const httpTrigger = new cre.capabilities.HTTPCapability();

	return [
		cre.handler(
			httpTrigger.trigger({
				authorizedKeys: [
					{
						type: "KEY_TYPE_ECDSA_EVM",
						publicKey: config.authorizedEVMAddress,
					},
				],
			}),
			onHttpTrigger,
		),
	];
};

export async function main() {
	const runner = await Runner.newRunner<Config>({ configSchema: ConfigSchema });
	await runner.run(initWorkflow);
}

main();
