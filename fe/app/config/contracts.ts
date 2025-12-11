import { type Address, erc20Abi } from "viem";
import { arbitrumSepolia, baseSepolia, sepolia } from "viem/chains";

export const USDC_ADDRESSES: Record<number, Address> = {
	[sepolia.id]: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
	[baseSepolia.id]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
	[arbitrumSepolia.id]: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
};

export const TOKEN_MESSENGER_ADDRESSES: Record<number, Address> = {
	[sepolia.id]: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
	[baseSepolia.id]: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
	[arbitrumSepolia.id]: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
};

export const CIRCLE_FAUCET_URL = "https://faucet.circle.com/";

export { erc20Abi };
