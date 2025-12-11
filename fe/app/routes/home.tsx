import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { css } from "styled-system/css";
import { FloatingLines } from "~/components/backgrounds/floating-lines";
import { GlassSurface } from "~/components/glass-surface";
import { TextType } from "~/components/text-type";
import { Badge, Button, Card, Heading, Text } from "~/components/ui";
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
	// const examples = [
	// 	{
	// 		title: "Cross-Chain Relayer",
	// 		desc: "Bridge USDC across testnets with CRE attestations and CCTP.",
	// 		href: "/examples/cross-chain-relayer",
	// 		tag: "Live demo",
	// 	},
	// ];

	return (
		<div
			className={css({
				position: "relative",
				minHeight: "100vh",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				bg: "gray.1",
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
					maxWidth: "1100px",
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
						gridTemplateColumns: { base: "1fr", md: "1.1fr 0.9fr" },
						gap: "8",
					})}
				>
					<div
						className={css({
							display: "flex",
							flexDirection: "column",
							gap: "5",
							color: "white",
						})}
					>
						<Badge
							variant="surface"
							colorPalette="teal"
							size="sm"
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
								minHeight: "2.5rem",
							})}
						/>

						<div
							className={css({
								display: "flex",
								gap: "3",
								alignItems: "center",
								flexWrap: "wrap",
							})}
						>
							<Link to="/examples/cross-chain-relayer">
								<Button size="lg" variant="surface" backdropBlur={"3xl"}>
									Launch demo
									<ArrowRight
										className={css({ width: "5", height: "5", ml: "2" })}
									/>
								</Button>
							</Link>
							<Badge variant="surface" colorPalette="gray" size="sm">
								<ShieldCheck className={css({ width: "3", height: "3", mr: "2" })} />
								Testnet safe
							</Badge>
							<Badge variant="surface" colorPalette="blue" size="sm">
								<Sparkles className={css({ width: "3", height: "3", mr: "2" })} />
								CCTP + CRE
							</Badge>
						</div>
					</div>

					<div
						className={css({
							display: "flex",
							flexDirection: "column",
							gap: "4",
						})}
					>
						{/* <Card.Root
							className={css({
								bg: "rgba(15,23,42,0.5)",
								borderColor: "rgba(255,255,255,0.12)",
								color: "white",
								backdropFilter: "blur(12px)",
							})}
						>
							<Card.Header>
								<Card.Title>Available demos</Card.Title>
								<Card.Description>
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
								{examples.map((example) => (
									<Link key={example.title} to={example.href}>
										<div
											className={css({
												display: "flex",
												justifyContent: "space-between",
												alignItems: "center",
												padding: "3",
												borderRadius: "lg",
												border: "1px solid",
												borderColor: "rgba(255,255,255,0.12)",
												background:
													"linear-gradient(135deg, rgba(45,212,191,0.16), rgba(59,130,246,0.18))",
												_hover: {
													borderColor: "rgba(255,255,255,0.3)",
													transform: "translateY(-2px)",
												},
												transition: "all 0.2s ease",
											})}
										>
											<div className={css({ display: "flex", gap: "2", flexDir: "column" })}>
												<Text className={css({ fontWeight: "semibold" })}>
													{example.title}
												</Text>
												<Text className={css({ color: "rgba(255,255,255,0.8)" })}>
													{example.desc}
												</Text>
											</div>
											<Badge variant="solid" colorPalette="teal" size="sm">
												{example.tag}
											</Badge>
										</div>
									</Link>
								))}
							</Card.Body>
						</Card.Root> */}
					</div>
				</div>
			</GlassSurface>
		</div>
	);
}
