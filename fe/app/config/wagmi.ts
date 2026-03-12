import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { cookieStorage, createStorage, fallback, http } from "wagmi";
import { arbitrumSepolia, baseSepolia, sepolia } from "wagmi/chains";

const RPC_TIMEOUT_MS = 2_500;

const splitRpcUrls = (value: string | undefined) =>
	value
		?.split(",")
		.map((url) => url.trim())
		.filter(Boolean) ?? [];

const uniqueRpcUrls = (urls: string[]) => [...new Set(urls)];

const createFallbackTransport = (urls: string[]) =>
	fallback(
		uniqueRpcUrls(urls).map((url) => http(url, { timeout: RPC_TIMEOUT_MS })),
		{ retryCount: 0 },
	);

const sepoliaRpcUrls = [
	...splitRpcUrls(import.meta.env.VITE_SEPOLIA_RPC_URLS),
	"https://sepolia.drpc.org",
	"https://ethereum-sepolia-rpc.publicnode.com",
	"https://sepolia.gateway.tenderly.co",
	...sepolia.rpcUrls.default.http,
];

const baseSepoliaRpcUrls = [
	...splitRpcUrls(import.meta.env.VITE_BASE_SEPOLIA_RPC_URLS),
	...baseSepolia.rpcUrls.default.http,
	"https://base-sepolia-rpc.publicnode.com",
	"https://base-sepolia.drpc.org",
];

const arbitrumSepoliaRpcUrls = [
	...splitRpcUrls(import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URLS),
	...arbitrumSepolia.rpcUrls.default.http,
	"https://arbitrum-sepolia-rpc.publicnode.com",
	"https://arbitrum-sepolia.drpc.org",
];

export const config = getDefaultConfig({
	appName: "CRE Examples",
	projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "demo",
	chains: [sepolia, baseSepolia, arbitrumSepolia],
	ssr: true,
	storage: createStorage({ storage: cookieStorage }),
	transports: {
		[sepolia.id]: createFallbackTransport(sepoliaRpcUrls),
		[baseSepolia.id]: createFallbackTransport(baseSepoliaRpcUrls),
		[arbitrumSepolia.id]: createFallbackTransport(arbitrumSepoliaRpcUrls),
	},
});

declare module "wagmi" {
	interface Register {
		config: typeof config;
	}
}
