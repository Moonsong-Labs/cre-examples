import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ArrowLeftRight, Home } from "lucide-react";
import { Link } from "react-router";
import { css } from "styled-system/css";
import { GooeyNav } from "~/components/gooey-nav/gooey-nav";
import { Text } from "~/components/ui";

const NAV_ITEMS = [
	{ href: "/", label: "Home", icon: Home },
	{
		href: "/examples/cross-chain-relayer",
		label: "Cross-Chain Relayer",
		icon: ArrowLeftRight,
	},
];

export function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<div
			className={css({
				minHeight: "100vh",
				display: "flex",
				flexDirection: "column",
				bg: "gray.1",
				color: "fg.default",
			})}
		>
			<header
				className={css({
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					p: "4",
					borderBottom: "1px solid",
					borderColor: "border",
					bg: "gray.2",
				})}
			>
				<Link to="/" className={css({ textDecoration: "none" })}>
					<Text
						as="h1"
						className={css({
							fontSize: "xl",
							fontWeight: "bold",
							color: "teal.11",
						})}
					>
						CRE Examples
					</Text>
				</Link>
				<ConnectButton showBalance={false} chainStatus="icon" />
			</header>

			<div className={css({ display: "flex", flex: "1" })}>
				<aside
					className={css({
						width: "64",
						borderRight: "1px solid",
						borderColor: "border",
						bg: "gray.2",
						p: "4",
						display: { base: "none", md: "block" },
					})}
				>
					<Text
						className={css({
							fontSize: "xs",
							fontWeight: "semibold",
							color: "fg.subtle",
							textTransform: "uppercase",
							letterSpacing: "wider",
							mb: "3",
						})}
					>
						Examples
					</Text>
					<GooeyNav items={NAV_ITEMS} />
				</aside>

				<main className={css({ flex: "1", overflow: "auto" })}>{children}</main>
			</div>
		</div>
	);
}
