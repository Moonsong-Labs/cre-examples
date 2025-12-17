import { type Address, erc20Abi } from "viem";
import { arbitrumSepolia, baseSepolia, sepolia } from "viem/chains";
import compliantTokenAbi from "../abi/compliant-token.json";

export const USDC_ADDRESSES: Record<number, Address> = {
	[sepolia.id]: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
	[baseSepolia.id]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
	[arbitrumSepolia.id]: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
};

export const CIRCLE_FAUCET_URL = "https://faucet.circle.com/";
export const COMPLIANT_TOKEN_ADDRESS: Address = "0xADFe793A0369a2a0c4b231391d361d9073dad6CF";

export { erc20Abi, compliantTokenAbi };
