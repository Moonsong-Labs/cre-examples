import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link, NavLink, useLocation } from "react-router";
import { css } from "styled-system/css";
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
						<nav aria-label="Examples navigation">
							<ul
								className={css({
									display: "flex",
									flexDirection: "column",
									gap: "1",
									listStyle: "none",
									p: 0,
									m: 0,
								})}
							>
								{NAV_ITEMS.map((item) => {
									const Icon = item.icon;
									return (
										<li key={item.href}>
											<NavLink
												to={item.href}
												end={item.href === "/"}
												className={({ isActive }) =>
													css({
														display: "flex",
														alignItems: "center",
														gap: "3",
														px: "3",
														py: "2.5",
														borderRadius: "md",
														fontSize: "sm",
														fontWeight: "medium",
														color: isActive ? "white" : "fg.muted",
														bg: isActive ? "teal.9" : "transparent",
														transform: isActive ? "translateX(2px)" : "none",
														transition:
															"background-color 0.2s ease, color 0.2s ease, transform 0.2s ease",
														_hover: {
															bg: isActive ? "teal.9" : "gray.3",
															color: "fg.default",
														},
													})
												}
											>
												{Icon && (
													<Icon className={css({ width: "4", height: "4" })} />
												)}
												<span>{item.label}</span>
											</NavLink>
										</li>
									);
								})}
							</ul>
						</nav>
					</aside>
				)}

				<main className={css({ flex: "1", overflow: "auto" })}>{children}</main>
			</div>
		</div>
	);
}
