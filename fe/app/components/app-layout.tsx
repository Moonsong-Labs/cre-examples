import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link, useLocation } from "react-router";
import { css } from "styled-system/css";
import { GooeyNav } from "~/components/gooey-nav/gooey-nav";
import { Text } from "~/components/ui";
import { NAV_ITEMS } from "~/config/examples";

export function AppLayout({ children }: { children: React.ReactNode }) {
	const location = useLocation();
	const isHome = location.pathname === "/";

	return (
		<div
			className={css({
				minHeight: "100vh",
				display: "flex",
				flexDirection: "column",
				bg: isHome ? "transparent" : "gray.1",
				color: "fg.default",
			})}
		>
			<header
				className={css({
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					p: "4",
					borderBottom: isHome ? "none" : "1px solid",
					borderColor: "border",
					bg: isHome ? "transparent" : "gray.2",
					position: isHome ? "absolute" : "relative",
					width: "100%",
					zIndex: 10,
				})}
			>
				<Link to="/" className={css({ textDecoration: "none" })}>
					<Text
						as="h1"
						className={css({
							fontSize: "xl",
							fontWeight: "bold",
							color: isHome ? "white" : "teal.11",
						})}
					>
						CRE Examples
					</Text>
				</Link>
				<ConnectButton showBalance={false} chainStatus="icon" />
			</header>

			<div className={css({ display: "flex", flex: "1" })}>
				{!isHome && (
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
				)}

				<main className={css({ flex: "1", overflow: "auto" })}>{children}</main>
			</div>
		</div>
	);
}
