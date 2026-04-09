import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link, NavLink, useLocation } from "react-router";
import { css } from "styled-system/css";
import { Text } from "~/components/ui";
import { NAV_ITEMS, preloadImages } from "~/config/examples";
import { AboutCREModal } from "./about-cre-modal";

export function AppLayout({ children }: { children: React.ReactNode }) {
	const location = useLocation();
	const isHome = location.pathname === "/";
	const exampleItems = NAV_ITEMS.filter((item) => item.href !== "/");

	return (
		<div
			className={css({
				minHeight: "100vh",
				display: "flex",
				flexDirection: "column",
				bg: isHome ? "transparent" : "transparent",
				color: "fg.default",
			})}
		>
			<header
				className={css({
					position: isHome ? "absolute" : "sticky",
					top: 0,
					width: "100%",
					zIndex: 10,
					px: { base: "4", md: "6" },
					pt: { base: "4", md: "5" },
				})}
			>
				<div
					className={css({
						maxWidth: isHome ? "unset" : "88rem",
						mx: isHome ? "0" : "auto",
						display: "flex",
						flexDirection: "column",
						gap: "3",
					})}
				>
					<div
						className={css({
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							gap: "4",
							px: { base: "4", md: "5" },
							py: "3",
							borderRadius: isHome ? "0" : "full",
							bg: isHome
								? "transparent"
								: "linear-gradient(180deg, rgba(255,255,255,0.82), rgba(243,247,250,0.62))",
							backdropFilter: isHome ? "none" : "blur(20px) saturate(120%)",
							boxShadow: isHome
								? "none"
								: "0 24px 60px -38px rgba(44,52,55,0.18), inset 0 1px 0 rgba(255,255,255,0.72)",
						})}
					>
						<Link to="/" className={css({ textDecoration: "none" })}>
							<div
								className={css({
									display: "flex",
								})}
							>
								<Text
									as="h1"
									className={css({
										fontFamily: '"Manrope", sans-serif',
										fontSize: "xl",
										fontWeight: "800",
										letterSpacing: "-0.03em",
										color: isHome ? "white" : "#2c3437",
									})}
								>
									CRE Examples
								</Text>
							</div>
						</Link>
						<div
							className={css({
								display: "flex",
								alignItems: "center",
								gap: "4",
							})}
						>
							<AboutCREModal />
							<ConnectButton showBalance={false} chainStatus="icon" />
						</div>
					</div>

					{!isHome && (
						<nav
							aria-label="Examples navigation"
							className={css({
								display: { base: "flex", md: "none" },
								gap: "2",
								overflowX: "auto",
								px: "1",
								pb: "1",
							})}
						>
							{NAV_ITEMS.map((item) => (
								<NavLink
									key={item.href}
									to={item.href}
									end={item.href === "/"}
									prefetch="intent"
									onMouseEnter={() => preloadImages(item.images)}
									onFocus={() => preloadImages(item.images)}
									className={({ isActive }) =>
										css({
											flexShrink: 0,
											px: "3.5",
											py: "2",
											borderRadius: "full",
											textDecoration: "none",
											fontSize: "sm",
											fontWeight: "600",
											color: isActive
												? (item.navFg ?? "#2c3437")
												: "rgba(44,52,55,0.62)",
											bg: isActive
												? (item.navBg ?? "rgba(255,255,255,0.82)")
												: "rgba(255,255,255,0.38)",
											backdropFilter: "blur(18px) saturate(120%)",
											boxShadow: isActive
												? `0 18px 40px -30px ${item.navGlow ?? "rgba(44,52,55,0.18)"}`
												: "none",
										})
									}
								>
									{item.label}
								</NavLink>
							))}
						</nav>
					)}
				</div>
			</header>

			<div
				className={css({
					display: "flex",
					flex: "1",
					maxWidth: isHome ? "unset" : "96rem",
					mx: isHome ? "0" : "auto",
					width: "100%",
					gap: { md: "6", xl: "8" },
					px: isHome ? "0" : { md: "6", xl: "8" },
					pb: isHome ? "0" : { base: "8", md: "10" },
					pt: isHome ? "0" : { md: "4" },
				})}
			>
				{!isHome && (
					<aside
						className={css({
							width: "16rem",
							pt: "6",
							display: { base: "none", md: "block" },
							flexShrink: 0,
						})}
					>
						<div
							className={css({
								position: "sticky",
								top: "6.75rem",
								display: "flex",
								flexDirection: "column",
								gap: "2",
								p: "2",
								borderRadius: "28px",
								bg: "transparent",
							})}
						>
							<nav aria-label="Examples navigation">
								<ul
									className={css({
										display: "flex",
										flexDirection: "column",
										gap: "1.5",
										listStyle: "none",
										p: 0,
										m: 0,
									})}
								>
									{exampleItems.map((item) => {
										const Icon = item.icon;
										return (
											<li key={item.href}>
												<NavLink
													to={item.href}
													end={item.href === "/"}
													prefetch="intent"
													onMouseEnter={() => preloadImages(item.images)}
													onFocus={() => preloadImages(item.images)}
													className={({ isActive }) =>
														css({
															display: "flex",
															alignItems: "center",
															gap: "3",
															px: "3.5",
															py: "3",
															borderRadius: "20px",
															fontSize: "sm",
															fontWeight: "600",
															textDecoration: "none",
															color: isActive
																? (item.navFg ?? "#2c3437")
																: "rgba(44,52,55,0.62)",
															bg: isActive
																? (item.navBg ?? "rgba(255,255,255,0.88)")
																: "transparent",
															transform: isActive ? "translateX(4px)" : "none",
															boxShadow: isActive
																? `0 20px 40px -34px ${item.navGlow ?? "rgba(44,52,55,0.22)"}`
																: "none",
															transition:
																"background-color 0.2s ease, color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
															_hover: {
																bg: isActive
																	? (item.navBg ?? "rgba(255,255,255,0.88)")
																	: "rgba(255,255,255,0.44)",
																color: isActive
																	? (item.navFg ?? "#2c3437")
																	: "#2c3437",
															},
														})
													}
												>
													{Icon && (
														<Icon
															className={css({
																width: "4",
																height: "4",
																color: isHome
																	? "white"
																	: (item.navFg ?? "inherit"),
																opacity:
																	location.pathname === item.href ? 1 : 0.72,
															})}
														/>
													)}
													<div
														className={css({
															display: "flex",
														})}
													>
														<span>{item.label}</span>
													</div>
												</NavLink>
											</li>
										);
									})}
								</ul>
							</nav>
						</div>
					</aside>
				)}

				<main
					className={css({
						flex: "1",
						minWidth: 0,
						overflow: "auto",
					})}
				>
					{children}
				</main>
			</div>
		</div>
	);
}
