import type { Address } from "viem";
import { arbitrumSepolia, baseSepolia, sepolia } from "viem/chains";

export const TOKEN_MESSENGER_V2_ADDRESS =
	"0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA" as const;

export const MESSAGE_TRANSMITTER_V2_ADDRESS =
	"0xe737e5cebeeba77efe34d4aa090756590b1ce275" as const;

export const RECEIVER_ADDRESSES: Record<number, `0x${string}`> = {
	[sepolia.id]: "0x9f430E32ffbbe270F48048BBe64F0D8d35127D10",
	[baseSepolia.id]: "0x8762FCCfF9b5C32F1FDAa31AA70c1D9d99734417",
	[arbitrumSepolia.id]: "0xf4D3aBEA2360D4f5f614F375fAd8d5d00F32be36",
};

export const CCTP_DOMAINS: Record<number, number> = {
	[sepolia.id]: 0,
	[baseSepolia.id]: 6,
	[arbitrumSepolia.id]: 3,
};

export const FINALITY_THRESHOLD = {
	FAST: 1000,
	SLOW: 2000,
} as const;

export const IRIS_API_BASE = "https://iris-api-sandbox.circle.com/v2";

export interface FeeEntry {
	finalityThreshold: number;
	minimumFee: number;
}

export async function fetchBridgeFee(
	sourceDomain: number,
	destDomain: number,
	amount: bigint,
	speed: "FAST" | "SLOW" = "FAST",
): Promise<bigint> {
	const url = `${IRIS_API_BASE}/burn/USDC/fees/${sourceDomain}/${destDomain}`;
	try {
		const res = await fetch(url);
		if (!res.ok) return 0n;

		const feeArr = (await res.json()) as FeeEntry[];
		const threshold =
			speed === "FAST" ? FINALITY_THRESHOLD.FAST : FINALITY_THRESHOLD.SLOW;
		const entry = feeArr.find((f) => f.finalityThreshold === threshold);
		const feePct = entry?.minimumFee ?? 0;
		// minimumFee is in 0.1% units (1 = 0.1%), so divide by 1000
		return (amount * BigInt(feePct) + 999n) / 1000n;
	} catch {
		return 0n;
	}
}

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
			{ indexed: true, name: "finalityThresholdExecuted", type: "uint32" },
			{ indexed: false, name: "messageBody", type: "bytes" },
		],
		name: "MessageReceived",
		type: "event",
	},
] as const;

export const tokenMessengerAbi = [
	{
		inputs: [
			{ name: "amount", type: "uint256" },
			{ name: "destinationDomain", type: "uint32" },
			{ name: "mintRecipient", type: "bytes32" },
			{ name: "burnToken", type: "address" },
			{ name: "destinationCaller", type: "bytes32" },
			{ name: "maxFee", type: "uint256" },
			{ name: "minFinalityThreshold", type: "uint32" },
		],
		name: "depositForBurn",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function",
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

export type RelayStatus =
	| "pending"
	| "polling"
	| "ready"
	| "relayed"
	| "failed";

export interface RelayStatusResponse {
	burnTxHash: string;
	status: RelayStatus;
	sourceDomain: number;
	destinationDomain: number;
	depositor: string;
	createdAt: number;
	updatedAt: number;
	retryCount: number;
	errorMessage: string | null;
	attestation: string | null;
	message: string | null;
}

export async function fetchRelayStatus(
	burnTxHash: string,
): Promise<RelayStatusResponse | null> {
	const baseUrl = import.meta.env.VITE_CRE_HELPER_SERVER_URL;
	const apiKey = import.meta.env.VITE_CRE_HELPER_API_KEY;

	if (!baseUrl) return null;

	try {
		const res = await fetch(`${baseUrl}/mailbox/${burnTxHash}`, {
			headers: { "x-api-key": apiKey ?? "" },
		});
		if (!res.ok) return null;
		return (await res.json()) as RelayStatusResponse;
	} catch {
		return null;
	}
}

export type IrisAttestationStatus = "pending" | "complete";

export interface IrisMessage {
	attestation: string;
	message: string;
	eventNonce: string;
	cctpVersion: number;
	status: string;
	decodedMessage: unknown;
	delayReason?: string;
}

export interface IrisResponse {
	messages: IrisMessage[];
}

export async function fetchIrisAttestation(
	sourceDomain: number,
	txHash: string,
): Promise<{ status: IrisAttestationStatus; attestation?: string } | null> {
	try {
		const res = await fetch(
			`${IRIS_API_BASE}/messages/${sourceDomain}?transactionHash=${txHash}`,
		);
		if (!res.ok) return null;

		const data = (await res.json()) as IrisResponse;
		const msg = data.messages?.[0];
		if (!msg) return null;

		if (msg.status === "complete" && msg.attestation !== "PENDING") {
			return { status: "complete", attestation: msg.attestation };
		}
		return { status: "pending" };
	} catch {
		return null;
	}
}
