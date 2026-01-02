import {
	bytesToHex,
	consensusIdenticalAggregation,
	cre,
	decodeJson,
	type EVMLog,
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
	decodeEventLog,
	decodeFunctionResult,
	encodeAbiParameters,
	encodeFunctionData,
	type Hex,
	keccak256,
	toHex,
	zeroAddress,
} from "viem";
import { z } from "zod";
import { AirdropToken } from "./abi/AirdropToken";
import { type ClaimCompleteResult, postClaimComplete } from "./lib/backend";

// Claimed(address indexed account, uint256 amount, bytes32 indexed root)
const CLAIMED_EVENT_SIGNATURE = keccak256(
	toHex("Claimed(address,uint256,bytes32)"),
);

const ConfigSchema = z.object({
	authorizedEVMAddress: z.string().min(1, "Authorized EVM address is required"),
	airdropBaseUrl: z.string().min(1, "Airdrop base URL is required"),
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

const ClaimPayloadSchema = z.object({
	address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
	amount: z.string().min(1, "Amount is required"),
	proof: z.array(
		z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid bytes32 proof element"),
	),
	root: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid bytes32 root"),
});

type ClaimPayload = z.infer<typeof ClaimPayloadSchema>;

const getContractMerkleRoot = (runtime: Runtime<Config>): Hex => {
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
				to: evmConfig.tokenAddress as Hex,
				data: encodeFunctionData({
					abi: AirdropToken,
					functionName: "merkleRoot",
				}),
			}),
			blockNumber: LATEST_BLOCK_NUMBER,
		})
		.result();

	return decodeFunctionResult({
		abi: AirdropToken,
		functionName: "merkleRoot",
		data: bytesToHex(result.data),
	});
};

const executeClaimOnChain = (
	runtime: Runtime<Config>,
	claim: ClaimPayload,
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

	// Encode claim payload: (address, amount, proof[])
	const claimPayload = encodeAbiParameters(
		[{ type: "address" }, { type: "uint256" }, { type: "bytes32[]" }],
		[claim.address as Hex, BigInt(claim.amount), claim.proof as Hex[]],
	);

	// Wrap with action type: (ACTION_CLAIM = 1, payload)
	const encodedPayload = encodeAbiParameters(
		[{ type: "uint8" }, { type: "bytes" }],
		[1, claimPayload],
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

	runtime.log(
		`Executing claim for ${claim.address} on ${evmConfig.tokenAddress}`,
	);

	const claimResult = evmClient
		.writeReport(runtime, {
			receiver: evmConfig.tokenAddress,
			report: reportResponse,
			gasConfig: {
				gasLimit: evmConfig.gasLimit,
			},
		})
		.result();

	if (claimResult.txStatus !== TxStatus.SUCCESS) {
		throw new Error(
			`Failed to execute claim: ${claimResult.errorMessage || claimResult.txStatus}`,
		);
	}

	const txHash = bytesToHex(claimResult.txHash || new Uint8Array(32));
	runtime.log(`Claim transaction succeeded: ${txHash}`);

	return txHash;
};

const onHttpTrigger = (
	runtime: Runtime<Config>,
	payload: HTTPPayload,
): string => {
	const rawInput = decodeJson(payload.input) as unknown;
	const claim = ClaimPayloadSchema.parse(rawInput);

	runtime.log(`Claim workflow triggered for address: ${claim.address}`);
	runtime.log(`Amount: ${claim.amount}, Proof length: ${claim.proof.length}`);

	// Verify merkle root matches contract before executing
	const contractRoot = getContractMerkleRoot(runtime);

	if (contractRoot.toLowerCase() !== claim.root.toLowerCase()) {
		throw new Error(
			`Merkle root mismatch: contract has ${contractRoot}, claim has ${claim.root}`,
		);
	}

	runtime.log(`Merkle root verified: ${contractRoot}`);

	return executeClaimOnChain(runtime, claim);
};

const notifyBackendClaimComplete = (
	runtime: Runtime<Config>,
	address: Hex,
): ClaimCompleteResult => {
	const httpClient = new cre.capabilities.HTTPClient();
	const baseUrl = runtime.config.airdropBaseUrl;
	const apiKey = runtime.getSecret({ id: "AIRDROP_API_KEY" }).result().value;

	return httpClient
		.sendRequest(
			runtime,
			postClaimComplete,
			consensusIdenticalAggregation<ClaimCompleteResult>(),
		)(baseUrl, apiKey, address)
		.result();
};

const onLogTrigger = (runtime: Runtime<Config>, log: EVMLog): string => {
	runtime.log("Claimed event detected, notifying backend.");

	const rawTopics = log.topics.map((t: Uint8Array) => bytesToHex(t));

	const event = decodeEventLog({
		abi: AirdropToken,
		data: bytesToHex(log.data),
		eventName: "Claimed",
		topics: rawTopics as [Hex, ...Hex[]],
	});

	const address = event.args.account;
	runtime.log(
		`Claimed event for address: ${address}, amount: ${event.args.amount}`,
	);

	const result = notifyBackendClaimComplete(runtime, address);

	if (result.ok) {
		runtime.log(`Successfully marked ${address} as claimed`);
	} else {
		runtime.log(
			`Failed to mark ${address} as claimed: status ${result.statusCode}`,
		);
	}

	return address;
};

const initWorkflow = (config: Config) => {
	const httpTrigger = new cre.capabilities.HTTPCapability();
	const evmConfig = config.evms[0];

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

	return [
		// HTTP trigger for initiating claims
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
		// EVMLog trigger for detecting Claimed events
		cre.handler(
			evmClient.logTrigger({
				addresses: [hexToBase64(evmConfig.tokenAddress as Hex)],
				confidence: "CONFIDENCE_LEVEL_LATEST",
				topics: [
					{
						values: [hexToBase64(CLAIMED_EVENT_SIGNATURE)],
					},
				],
			}),
			onLogTrigger,
		),
	];
};

export async function main() {
	const runner = await Runner.newRunner<Config>({ configSchema: ConfigSchema });
	await runner.run(initWorkflow);
}

main();
