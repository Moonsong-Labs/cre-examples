import { ArrowLeftRight, Home } from "lucide-react";
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
];

export const NAV_ITEMS = [
	{ href: "/", label: "Home", icon: Home },
	...EXAMPLES.map((example) => ({
		href: example.href,
		label: example.navLabel ?? example.title,
		icon: example.icon,
	})),
];
