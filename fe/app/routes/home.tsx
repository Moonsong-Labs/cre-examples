import { ArrowRight, ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { css } from "styled-system/css";
import { FloatingLines } from "~/components/backgrounds/floating-lines";
import { GlassSurface } from "~/components/glass-surface";
import { TextType } from "~/components/text-type";
import { Badge, Button, Card, Heading, Text } from "~/components/ui";
import { EXAMPLES } from "~/config/examples";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "CRE Examples" },
		{
			name: "description",
			content:
				"Explore examples showcasing the Cross-Chain Runtime Environment for building cross-chain applications.",
		},
	];
}

export default function Home() {
	const primaryExample = EXAMPLES[0];

	return (
		<div
			className={css({
				position: "relative",
				minHeight: "100vh",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			})}
		>
			<div
				className={css({
					position: "fixed",
					inset: 0,
					zIndex: 0,
					pointerEvents: "auto",
				})}
			>
				<FloatingLines
					linesGradient={["#14b8a6", "#0891b2", "#6366f1", "#8b5cf6"]}
					enabledWaves={["top", "middle", "bottom"]}
					lineCount={[8, 6, 5]}
					lineDistance={[4, 5, 6]}
					animationSpeed={0.8}
					bendStrength={-0.3}
					parallaxStrength={0.15}
				/>
			</div>

			<GlassSurface
				width="100%"
				height="auto"
				borderRadius={32}
				brightness={15}
				opacity={0.85}
				blur={16}
				backgroundOpacity={0.1}
				className={css({
					maxWidth: "1200px",
					mx: "6",
					position: "relative",
					zIndex: 1,
				})}
			>
				<div
					className={css({
						py: { base: "10", md: "16" },
						px: { base: "6", md: "10" },
						display: "grid",
						gridTemplateColumns: { base: "1fr", lg: "1fr 1fr" },
						gap: "12",
						alignItems: "center",
					})}
				>
					<div
						className={css({
							display: "flex",
							flexDirection: "column",
							gap: "6",
							color: "white",
						})}
					>
						<Heading
							as="h1"
							textStyle={{ base: "5xl", md: "7xl" }}
							className={css({ fontWeight: "900", lineHeight: "1.05" })}
						>
							Solve Interoperability with Scriptable Oracles.
						</Heading>

						<TextType
							text={[
								"Ship interoperable dapps with Chainlink's Runtime Environment.",
								"Orchestrate complex cross-chain workflows in TypeScript.",
								"Connect private API data to public smart contracts.",
								"Build next-gen DeFi with Scriptable Oracles.",
							]}
							typingSpeed={45}
							cursorCharacter="_"
							deletingSpeed={28}
							variableSpeed={{ min: 30, max: 70 }}
							pauseDuration={2200}
							className={css({
								textStyle: "2xl",
								minHeight: "5rem",
								color: "rgba(255,255,255,0.9)",
							})}
						/>

						<div
							className={css({
								display: "flex",
								gap: "4",
								alignItems: "center",
								flexWrap: "wrap",
								pt: "4",
							})}
						>
							<Link
								to={primaryExample?.href ?? "/examples/cross-chain-relayer"}
								data-group
							>
								<Button
									size="xl"
									className={css({
										position: "relative",
										overflow: "hidden",
										background:
											"linear-gradient(135deg, #14b8a6 0%, #0891b2 50%, #6366f1 100%)",
										backgroundSize: "200% 200%",
										color: "white",
										fontWeight: "bold",
										border: "2px solid rgba(255, 255, 255, 0.2)",
										borderRadius: "xl",
										transition: "all 0.3s ease",
										animation: "pulse-glow 2s ease-in-out infinite",
										_before: {
											content: '""',
											position: "absolute",
											inset: 0,
											background:
												"linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)",
											animation: "shimmer 2s infinite",
										},
										_hover: {
											transform: "scale(1.05)",
											backgroundPosition: "100% 0",
											borderColor: "rgba(255, 255, 255, 0.4)",
										},
									})}
								>
									Launch demo
									<ArrowRight
										className={css({
											width: "5",
											height: "5",
											ml: "2",
											transition: "transform 0.3s ease",
											_groupHover: {
												transform: "translateX(4px)",
											},
										})}
									/>
								</Button>
							</Link>
						</div>
					</div>

					<div
						className={css({
							display: "flex",
							flexDirection: "column",
							gap: "4",
						})}
					>
						<Card.Root
							className={css({
								bg: "rgba(15,23,42,0.3)",
								border: "1px solid rgba(255,255,255,0.08)",
								color: "white",
								backdropFilter: "blur(12px)",
								boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
							})}
						>
							<Card.Header>
								<Card.Title>Available demos</Card.Title>
								<Card.Description
									className={css({ color: "rgba(255,255,255,0.7)!" })}
								>
									Hands-on flows you can run in the browser.
								</Card.Description>
							</Card.Header>
							<Card.Body
								className={css({
									display: "flex",
									flexDirection: "column",
									gap: "3",
								})}
							>
								{EXAMPLES.map((example) => {
									const Icon = example.icon;
									return (
										<Link
											key={example.href}
											to={example.href}
											data-group
											className={css({ textDecoration: "none" })}
										>
											<div
												className={css({
													display: "flex",
													justifyContent: "space-between",
													alignItems: "center",
													padding: "4",
													borderRadius: "lg",
													border: "1px solid",
													borderColor: "rgba(255,255,255,0.05)",
													bg: "rgba(255,255,255,0.02)",
													_hover: {
														borderColor: "rgba(255,255,255,0.15)",
														bg: "rgba(255,255,255,0.06)",
													},
													transition: "all 0.2s ease",
												})}
											>
												<div
													className={css({
														display: "flex",
														gap: "4",
														alignItems: "center",
													})}
												>
													{Icon && (
														<div
															className={css({
																width: "12",
																height: "10",
																borderRadius: "md",
																display: "grid",
																placeItems: "center",
																bg: "rgba(255,255,255,0.08)",
																color: "white",
																_groupHover: {
																	bg: "rgba(20,184,166,0.2)",
																	color: "teal.300",
																},
																transition: "colors 0.2s",
															})}
														>
															<Icon
																className={css({ width: "5", height: "5" })}
															/>
														</div>
													)}
													<div
														className={css({
															display: "flex",
															gap: "1",
															flexDirection: "column",
														})}
													>
														<Text
															className={css({
																fontWeight: "semibold",
																fontSize: "md",
																color: "white",
															})}
														>
															{example.title}
														</Text>
														<Text
															className={css({
																color: "rgba(255,255,255,0.6)",
																fontSize: "sm",
															})}
														>
															{example.description}
														</Text>
													</div>
												</div>
												<div
													className={css({
														display: "flex",
														alignItems: "center",
														gap: "3",
													})}
												>
													{example.tag && (
														<Badge
															variant="solid"
															colorPalette="teal"
															size="sm"
															className={css({
																display: { base: "none", sm: "inline-flex" },
															})}
														>
															{example.tag}
														</Badge>
													)}
													<ChevronRight
														className={css({
															width: "5",
															height: "5",
															color: "rgba(255,255,255,0.3)",
															_groupHover: {
																color: "white",
																transform: "translateX(2px)",
															},
															transition: "all 0.2s",
														})}
													/>
												</div>
											</div>
										</Link>
									);
								})}
							</Card.Body>
						</Card.Root>
					</div>
				</div>
			</GlassSurface>
		</div>
	);
}
