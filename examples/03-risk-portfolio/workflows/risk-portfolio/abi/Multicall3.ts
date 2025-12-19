import type { Address } from "viem";

export const Multicall3ABI = [
	{
		inputs: [
			{
				components: [
					{ name: "target", type: "address" },
					{ name: "allowFailure", type: "bool" },
					{ name: "callData", type: "bytes" },
				],
				name: "calls",
				type: "tuple[]",
			},
		],
		name: "aggregate3",
		outputs: [
			{
				components: [
					{ name: "success", type: "bool" },
					{ name: "returnData", type: "bytes" },
				],
				name: "returnData",
				type: "tuple[]",
			},
		],
		stateMutability: "payable",
		type: "function",
	},
	{
		inputs: [],
		name: "getBlockNumber",
		outputs: [{ name: "blockNumber", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [],
		name: "getCurrentBlockTimestamp",
		outputs: [{ name: "timestamp", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
] as const;

export const MULTICALL3_ADDRESS: Address =
	"0xcA11bde05977b3631167028862bE2a173976CA11";
