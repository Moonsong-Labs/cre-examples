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
	navBg?: string;
	navFg?: string;
	navGlow?: string;
}

export interface NavItem {
	href: string;
	label: string;
	icon?: ComponentType<{ className?: string }>;
	images?: string[];
	navBg?: string;
	navFg?: string;
	navGlow?: string;
}

export const EXAMPLES: ExampleDefinition[] = [
	{
		href: "/examples/cross-chain-relayer",
		title: "Cross-Chain Relayer",
		navLabel: "Cross-Chain Relayer",
		description: "Bridge USDC across testnets with CRE attestations and CCTP.",
		tag: "Live demo",
		icon: ArrowLeftRight,
		navBg: "rgba(215, 244, 239, 0.92)",
		navFg: "#0f6d61",
		navGlow: "rgba(94, 234, 212, 0.28)",
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
		navBg: "rgba(238, 231, 255, 0.94)",
		navFg: "#6e3bd8",
		navGlow: "rgba(143, 96, 250, 0.28)",
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
		navBg: "rgba(230, 244, 255, 0.94)",
		navFg: "#2563c9",
		navGlow: "rgba(96, 165, 250, 0.24)",
	},
	{
		href: "/examples/token-airdrop",
		title: "Token Airdrop",
		navLabel: "Token Airdrop",
		description: "Distribute tokens via merkle proof airdrop using CRE.",
		tag: "Live demo",
		icon: Gift,
		navBg: "rgba(255, 244, 223, 0.94)",
		navFg: "#a35b00",
		navGlow: "rgba(252, 211, 77, 0.28)",
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

export const NAV_ITEMS: NavItem[] = [
	{
		href: "/",
		label: "Home",
		icon: Home,
	},
	...EXAMPLES.map((example) => ({
		href: example.href,
		label: example.navLabel ?? example.title,
		icon: example.icon,
		images: example.images,
		navBg: example.navBg,
		navFg: example.navFg,
		navGlow: example.navGlow,
	})),
];

export function preloadImages(urls: string[] | undefined): void {
	if (!urls?.length) return;
	for (const url of urls) {
		const img = new Image();
		img.src = url;
	}
}
