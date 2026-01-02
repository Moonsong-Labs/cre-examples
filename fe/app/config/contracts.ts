import { type Address, erc20Abi } from "viem";
import { arbitrumSepolia, baseSepolia, sepolia } from "viem/chains";
import airdropTokenAbi from "../abi/airdrop-token.json";
import compliantTokenAbi from "../abi/compliant-token.json";
import riskMetricsOracleAbi from "../abi/risk-metrics-oracle.json";

export const USDC_ADDRESSES: Record<number, Address> = {
	[sepolia.id]: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
	[baseSepolia.id]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
	[arbitrumSepolia.id]: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
};

export const CIRCLE_FAUCET_URL = "https://faucet.circle.com/";
export const COMPLIANT_TOKEN_ADDRESS: Address =
	"0xADFe793A0369a2a0c4b231391d361d9073dad6CF";
export const RISK_METRICS_ORACLE_ADDRESS: Address =
	"0x2d46748AE30D26c11b45Ac9d9A4a96DD4172000A";
export const AIRDROP_TOKEN_ADDRESS: Address =
	"0xc864a70B9092D416B66E9c0e4AFb62b5163fD839";

export { erc20Abi, compliantTokenAbi, riskMetricsOracleAbi, airdropTokenAbi };
