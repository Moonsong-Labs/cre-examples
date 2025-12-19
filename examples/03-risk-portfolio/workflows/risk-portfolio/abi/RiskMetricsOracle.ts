export const RiskMetricsOracleABI = [
	{
		inputs: [],
		name: "latestMetrics",
		outputs: [
			{
				components: [
					{ internalType: "uint64", name: "updatedAt", type: "uint64" },
					{ internalType: "uint16[5]", name: "vols", type: "uint16[5]" },
					{ internalType: "int16[10]", name: "corrs", type: "int16[10]" },
				],
				internalType: "struct RiskMetricsOracle.Metrics",
				name: "metrics",
				type: "tuple",
			},
		],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [],
		name: "updatedAt",
		outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [],
		name: "packedVols",
		outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
	{
		inputs: [],
		name: "packedCorrs",
		outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
] as const;

export const ReportDataABI = [
	{
		components: [
			{ name: "timestamp", type: "uint64" },
			{ name: "packedVols", type: "uint256" },
			{ name: "packedCorrs", type: "uint256" },
		],
		name: "ReportData",
		type: "tuple",
	},
] as const;
