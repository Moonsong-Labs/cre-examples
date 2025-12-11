import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { arbitrumSepolia, baseSepolia, sepolia } from "wagmi/chains";

export const config = getDefaultConfig({
	appName: "Cross-Chain Relayer",
	projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "demo",
	chains: [sepolia, baseSepolia, arbitrumSepolia],
	transports: {
		[sepolia.id]: http(sepolia.rpcUrls.default.http[0]),
		[baseSepolia.id]: http(baseSepolia.rpcUrls.default.http[0]),
		[arbitrumSepolia.id]: http(arbitrumSepolia.rpcUrls.default.http[0]),
	},
});

declare module "wagmi" {
	interface Register {
		config: typeof config;
	}
}
