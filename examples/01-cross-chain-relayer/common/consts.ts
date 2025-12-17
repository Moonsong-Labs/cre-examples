export const ENVIRONMENT_INFO = {
	0: {
		name: "Sepolia",
		relayerAddress: "0x9f430E32ffbbe270F48048BBe64F0D8d35127D10",
		chainSelector: "ethereum-testnet-sepolia",
		usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
		blockExplorerUrl: "https://sepolia.etherscan.io",
	},
	3: {
		name: "Arbitrum Sepolia",
		relayerAddress: "0xf4D3aBEA2360D4f5f614F375fAd8d5d00F32be36",
		chainSelector: "ethereum-testnet-sepolia-arbitrum-1",
		usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
		blockExplorerUrl: "https://sepolia.arbiscan.io",
	},
	6: {
		name: "Base Sepolia",
		relayerAddress: "0x8762FCCfF9b5C32F1FDAa31AA70c1D9d99734417",
		chainSelector: "ethereum-testnet-sepolia-base-1",
		usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
		blockExplorerUrl: "https://sepolia.basescan.org",
	},
} as const;

export type Domain = keyof typeof ENVIRONMENT_INFO;

export const TOKEN_MESSENGER_V2_TESTNET =
	"0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA" as const;

export const MAILBOX_API_KEY_SECRET = "MAILBOX_API_KEY";
