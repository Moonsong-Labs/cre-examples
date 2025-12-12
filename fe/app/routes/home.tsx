import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
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
						<Badge
							variant="surface"
							colorPalette="teal"
							size="md"
							className={css({ alignSelf: "flex-start" })}
						>
							CRE Examples
						</Badge>
						<Heading
							as="h1"
							textStyle={{ base: "5xl", md: "7xl" }}
							className={css({ fontWeight: "900", lineHeight: "1.05" })}
						>
							Build cross-chain experiences fast.
						</Heading>

						<TextType
							text={[
								"Ship interoperable dapps with Chainlink's Runtime Environment.",
								"See how CCTP + CRE attestations move USDC between chains.",
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
							>
								<Button size="xl" variant="surface" backdropBlur={"3xl"}>
									Launch demo
									<ArrowRight
										className={css({ width: "5", height: "5", ml: "2" })}
									/>
								</Button>
							</Link>
							<div className={css({ display: "flex", gap: "2" })}>
								<Badge variant="surface" colorPalette="gray" size="md">
									<ShieldCheck
										className={css({ width: "3.5", height: "3.5", mr: "1.5" })}
									/>
									Testnet safe
								</Badge>
								<Badge variant="surface" colorPalette="blue" size="md">
									<Sparkles
										className={css({ width: "3.5", height: "3.5", mr: "1.5" })}
									/>
									CCTP + CRE
								</Badge>
							</div>
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
								bg: "rgba(15,23,42,0.4)",
								border: "1px solid rgba(255,255,255,0.08)",
								color: "white",
								backdropFilter: "blur(12px)",
								boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
							})}
						>
							<Card.Header>
								<Card.Title>Available demos</Card.Title>
								<Card.Description className={css({ color: "rgba(255,255,255,0.7)!" })}>
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
													borderColor: "rgba(255,255,255,0.08)",
													bg: "rgba(255,255,255,0.03)",
													_hover: {
														borderColor: "rgba(255,255,255,0.2)",
														bg: "rgba(255,255,255,0.08)",
														transform: "translateY(-1px)",
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
																width: "10",
																height: "10",
																borderRadius: "md",
																display: "grid",
																placeItems: "center",
																bg: "rgba(255,255,255,0.1)",
															})}
														>
															<Icon
																className={css({
																	width: "5",
																	height: "5",
																	color: "white",
																})}
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
														<Text className={css({ fontWeight: "semibold", fontSize: "md" })}>
															{example.title}
														</Text>
														<Text
															className={css({
																color: "rgba(255,255,255,0.7)",
																fontSize: "sm",
															})}
														>
															{example.description}
														</Text>
													</div>
												</div>
												{example.tag && (
													<Badge variant="solid" colorPalette="teal" size="sm">
														{example.tag}
													</Badge>
												)}
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
