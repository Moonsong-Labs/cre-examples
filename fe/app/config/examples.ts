import {
	ArrowLeftRight,
	Gift,
	Home,
	PieChart,
	ShieldCheck,
} from "lucide-react";
import type { ComponentType } from "react";

export interface ExampleDefinition {
	href: string;
	title: string;
	description: string;
	tag?: string;
	icon?: ComponentType<{ className?: string }>;
	navLabel?: string;
	images?: string[];
}

export const EXAMPLES: ExampleDefinition[] = [
	{
		href: "/examples/cross-chain-relayer",
		title: "Cross-Chain Relayer",
		navLabel: "Cross-Chain Relayer",
		description: "Bridge USDC across testnets with CRE attestations and CCTP.",
		tag: "Live demo",
		icon: ArrowLeftRight,
		images: [
			"/eye-scanner-80.png",
			"/eye-scanner-160.png",
			"/shield-80.png",
			"/shield-160.png",
			"/paper-plane-80.png",
			"/paper-plane-160.png",
		],
	},
	{
		href: "/examples/compliant-token",
		title: "Compliant Token",
		navLabel: "Compliant Token",
		description:
			"Sync Google Spreadsheet allowlist to ERC20 token contract using CRE.",
		tag: "Live demo",
		icon: ShieldCheck,
		images: [
			"/written-code-80.png",
			"/written-code-160.png",
			"/workflow-nodes-80.png",
			"/workflow-nodes-160.png",
			"/shield-80.png",
			"/shield-160.png",
		],
	},
	{
		href: "/examples/risk-portfolio",
		title: "Risk-balanced Portfolio",
		navLabel: "Risk-balanced Portfolio",
		description:
			"Automated portfolio allocations driven by on-chain volatility and correlation metrics.",
		tag: "Demo",
		icon: PieChart,
	},
	{
		href: "/examples/token-airdrop",
		title: "Token Airdrop",
		navLabel: "Token Airdrop",
		description: "Distribute tokens via merkle proof airdrop using CRE.",
		tag: "Live demo",
		icon: Gift,
		images: [
			"/written-code-80.png",
			"/written-code-160.png",
			"/workflow-nodes-80.png",
			"/workflow-nodes-160.png",
			"/shield-80.png",
			"/shield-160.png",
		],
	},
];

export const NAV_ITEMS = [
	{ href: "/", label: "Home", icon: Home, images: undefined as string[] | undefined },
	...EXAMPLES.map((example) => ({
		href: example.href,
		label: example.navLabel ?? example.title,
		icon: example.icon,
		images: example.images,
	})),
];

export function preloadImages(urls: string[] | undefined): void {
	if (!urls?.length) return;
	for (const url of urls) {
		const img = new Image();
		img.src = url;
	}
}
