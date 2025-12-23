import {
	bytesToHex,
	consensusIdenticalAggregation,
	cre,
	getNetwork,
	type HTTPPayload,
	hexToBase64,
	Runner,
	type Runtime,
	TxStatus,
} from "@chainlink/cre-sdk";
import { encodeAbiParameters, type Hex } from "viem";
import { z } from "zod";
import { buildMerkleTree, type MerkleTreeData } from "./lib/merkle";
import { type ProofsUploadResult, uploadProofs } from "./lib/proofs";
import { type Allocations, fetchAllocations } from "./lib/spreadsheet";

const ConfigSchema = z.object({
	authorizedEVMAddress: z.string().min(1, "Authorized EVM address is required"),
	spreadsheetId: z.string().min(1, "Spreadsheet ID is required"),
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

const getSpreadsheetAllocations = (runtime: Runtime<Config>): Allocations => {
	const httpClient = new cre.capabilities.HTTPClient();
	const spreadsheetId = runtime.config.spreadsheetId;
	const apiKey = runtime.getSecret({ id: "GOOGLE_API_KEY" }).result().value;

	return httpClient
		.sendRequest(
			runtime,
			fetchAllocations,
			consensusIdenticalAggregation<Allocations>(),
		)(spreadsheetId, apiKey)
		.result();
};

const postProofsToServer = (
	runtime: Runtime<Config>,
	merkleTreeData: MerkleTreeData,
): ProofsUploadResult => {
	const httpClient = new cre.capabilities.HTTPClient();
	const baseUrl = runtime.config.airdropBaseUrl;
	const apiKey = runtime.getSecret({ id: "AIRDROP_API_KEY" }).result().value;

	return httpClient
		.sendRequest(
			runtime,
			uploadProofs,
			consensusIdenticalAggregation<ProofsUploadResult>(),
		)(baseUrl, apiKey, merkleTreeData)
		.result();
};

const postMerkleRootOnChain = (
	runtime: Runtime<Config>,
	merkleRoot: Hex,
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

	// Encode merkle root payload: (bytes32)
	const rootPayload = encodeAbiParameters([{ type: "bytes32" }], [merkleRoot]);

	// Wrap with action type: (ACTION_SET_MERKLE_ROOT = 0, payload)
	const encodedPayload = encodeAbiParameters(
		[{ type: "uint8" }, { type: "bytes" }],
		[0, rootPayload],
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

	runtime.log(`Posting merkle root ${merkleRoot} to ${evmConfig.tokenAddress}`);

	const result = evmClient
		.writeReport(runtime, {
			receiver: evmConfig.tokenAddress,
			report: reportResponse,
			gasConfig: {
				gasLimit: evmConfig.gasLimit,
			},
		})
		.result();

	if (result.txStatus !== TxStatus.SUCCESS) {
		throw new Error(
			`Failed to post merkle root: ${result.errorMessage || result.txStatus}`,
		);
	}

	const txHash = bytesToHex(result.txHash || new Uint8Array(32));
	runtime.log(`Merkle root posted successfully: ${txHash}`);

	return txHash;
};

const onHttpTrigger = (runtime: Runtime<Config>, _: HTTPPayload): string => {
	runtime.log("Airdrop workflow triggered.");

	// Step 1: Read allocations from spreadsheet
	const allocations = getSpreadsheetAllocations(runtime);
	runtime.log(
		`Fetched ${allocations.count} allocation entries from spreadsheet`,
	);

	if (allocations.count === 0) {
		runtime.log("No allocations found, skipping");
		return "no-allocations";
	}

	// Step 2: Build merkle tree
	const merkleTreeData = buildMerkleTree(allocations.entries);
	runtime.log(`Merkle root: ${merkleTreeData.root}`);

	// Step 3: Upload proofs to server
	const result = postProofsToServer(runtime, merkleTreeData);
	runtime.log(
		`Proofs uploaded: inserted=${result.inserted}, updated=${result.updated}, skipped=${result.skipped}, deleted=${result.deleted}`,
	);

	// Step 4: Post merkle root on-chain
	const txHash = postMerkleRootOnChain(runtime, merkleTreeData.root as Hex);

	return txHash;
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
