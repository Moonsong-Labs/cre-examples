import { ArrowLeftRight, Home, PieChart, ShieldCheck } from "lucide-react";
import type { ComponentType } from "react";

export interface ExampleDefinition {
	href: string;
	title: string;
	description: string;
	tag?: string;
	icon?: ComponentType<{ className?: string }>;
	navLabel?: string;
}

export const EXAMPLES: ExampleDefinition[] = [
	{
		href: "/examples/cross-chain-relayer",
		title: "Cross-Chain Relayer",
		navLabel: "Cross-Chain Relayer",
		description: "Bridge USDC across testnets with CRE attestations and CCTP.",
		tag: "Live demo",
		icon: ArrowLeftRight,
	},
	{
		href: "/examples/compliant-token",
		title: "Compliant Token",
		navLabel: "Compliant Token",
		description:
			"Sync Google Spreadsheet allowlist to ERC20 token contract using CRE.",
		tag: "Live demo",
		icon: ShieldCheck,
	},
	{
		href: "/examples/risk-portfolio",
		title: "Risk Portfolio",
		navLabel: "Risk Portfolio",
		description:
			"Dynamic portfolio allocations driven by on-chain volatility and correlation metrics.",
		tag: "Demo",
		icon: PieChart,
	},
];

export const NAV_ITEMS = [
	{ href: "/", label: "Home", icon: Home },
	...EXAMPLES.map((example) => ({
		href: example.href,
		label: example.navLabel ?? example.title,
		icon: example.icon,
	})),
];
