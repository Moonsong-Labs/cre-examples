import type { Address } from "viem";
import { arbitrumSepolia, baseSepolia, sepolia } from "viem/chains";

export const TOKEN_MESSENGER_V2_ADDRESS =
	"0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA" as const;

export const MESSAGE_TRANSMITTER_V2_ADDRESS =
	"0x7865fAfC2db2093669d92c0F33AeEF291086BEFD" as const;

export const CCTP_DOMAINS: Record<number, number> = {
	[sepolia.id]: 0,
	[baseSepolia.id]: 6,
	[arbitrumSepolia.id]: 3,
};

export const DOMAIN_TO_CHAIN_ID: Record<number, number> = {
	0: sepolia.id,
	6: baseSepolia.id,
	3: arbitrumSepolia.id,
};

export const CHAIN_NAMES: Record<number, string> = {
	[sepolia.id]: "Sepolia",
	[baseSepolia.id]: "Base Sepolia",
	[arbitrumSepolia.id]: "Arbitrum Sepolia",
};

export const ETHERSCAN_API_URLS: Record<number, string> = {
	[sepolia.id]: "https://api.etherscan.io/v2/api",
	[baseSepolia.id]: "https://api.etherscan.io/v2/api",
	[arbitrumSepolia.id]: "https://api.etherscan.io/v2/api",
};

export const BLOCK_EXPLORER_URLS: Record<number, string> = {
	[sepolia.id]: "https://sepolia.etherscan.io",
	[baseSepolia.id]: "https://sepolia.basescan.org",
	[arbitrumSepolia.id]: "https://sepolia.arbiscan.io",
};

export const depositForBurnEventAbi = [
	{
		anonymous: false,
		inputs: [
			{ indexed: true, name: "burnToken", type: "address" },
			{ indexed: false, name: "amount", type: "uint256" },
			{ indexed: true, name: "depositor", type: "address" },
			{ indexed: false, name: "mintRecipient", type: "bytes32" },
			{ indexed: false, name: "destinationDomain", type: "uint32" },
			{ indexed: false, name: "destinationTokenMessenger", type: "bytes32" },
			{ indexed: false, name: "destinationCaller", type: "bytes32" },
			{ indexed: false, name: "maxFee", type: "uint256" },
			{ indexed: true, name: "minFinalityThreshold", type: "uint32" },
			{ indexed: false, name: "hookData", type: "bytes" },
		],
		name: "DepositForBurn",
		type: "event",
	},
] as const;

export const messageReceivedEventAbi = [
	{
		anonymous: false,
		inputs: [
			{ indexed: true, name: "caller", type: "address" },
			{ indexed: false, name: "sourceDomain", type: "uint32" },
			{ indexed: true, name: "nonce", type: "bytes32" },
			{ indexed: false, name: "sender", type: "bytes32" },
			{ indexed: false, name: "messageBody", type: "bytes" },
		],
		name: "MessageReceived",
		type: "event",
	},
] as const;

export type BridgeEventType = "burn" | "mint";

export interface BridgeEvent {
	id: string;
	type: BridgeEventType;
	chainId: number;
	txHash: `0x${string}`;
	blockNumber: bigint;
	timestamp: number;
	depositor: Address;
	amount: bigint;
	sourceDomain: number;
	destinationDomain: number;
}
