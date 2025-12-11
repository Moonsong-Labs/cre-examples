import { Link } from "react-router";
import { ArrowLeftRight, ArrowRight, Zap, Shield, Globe } from "lucide-react";
import { css } from "styled-system/css";
import { Button, Card, Text, Badge } from "~/components/ui";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "CRE Examples - Cross-Chain Runtime Environment" },
		{
			name: "description",
			content:
				"Explore examples showcasing the Cross-Chain Runtime Environment for building cross-chain applications.",
		},
	];
}

const EXAMPLES = [
	{
		title: "Cross-Chain Relayer",
		description:
			"Bridge USDC cross-chain using Circle's CCTP with CRE attestation relay. Demonstrates seamless cross-chain token transfers.",
		href: "/examples/cross-chain-relayer",
		icon: ArrowLeftRight,
		status: "Live",
		tags: ["CCTP", "USDC", "Multi-chain"],
	},
];

const FEATURES = [
	{
		icon: Zap,
		title: "Lightning Fast",
		description: "Execute cross-chain transactions with minimal latency",
	},
	{
		icon: Shield,
		title: "Secure by Design",
		description: "Built on proven cryptographic attestation protocols",
	},
	{
		icon: Globe,
		title: "Multi-Chain",
		description: "Support for Ethereum, Base, Arbitrum and more",
	},
];

export default function Home() {
	return (
		<div className={css({ p: "6", maxWidth: "6xl", mx: "auto" })}>
			<section
				className={css({
					textAlign: "center",
					py: "12",
					mb: "8",
				})}
			>
				<Badge variant="surface" colorPalette="teal" className={css({ mb: "4" })}>
					Cross-Chain Runtime Environment
				</Badge>
				<Text
					as="h1"
					className={css({
						fontSize: { base: "3xl", md: "5xl" },
						fontWeight: "bold",
						mb: "4",
						background: "linear-gradient(135deg, token(colors.teal.11), token(colors.blue.11))",
						backgroundClip: "text",
						color: "transparent",
					})}
				>
					Build the Future of Cross-Chain
				</Text>
				<Text
					className={css({
						fontSize: { base: "lg", md: "xl" },
						color: "fg.muted",
						maxWidth: "2xl",
						mx: "auto",
						mb: "8",
					})}
				>
					Explore interactive examples demonstrating the power of the Cross-Chain
					Runtime Environment. Learn how to build seamless cross-chain
					applications.
				</Text>
				<div className={css({ display: "flex", gap: "4", justifyContent: "center" })}>
					<Link to="/examples/cross-chain-relayer">
						<Button size="lg">
							Get Started
							<ArrowRight className={css({ width: "4", height: "4", ml: "2" })} />
						</Button>
					</Link>
				</div>
			</section>

			<section className={css({ mb: "12" })}>
				<div
					className={css({
						display: "grid",
						gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
						gap: "6",
					})}
				>
					{FEATURES.map((feature) => {
						const Icon = feature.icon;
						return (
							<div
								key={feature.title}
								className={css({
									textAlign: "center",
									p: "6",
								})}
							>
								<div
									className={css({
										display: "inline-flex",
										alignItems: "center",
										justifyContent: "center",
										width: "12",
										height: "12",
										borderRadius: "full",
										bg: "teal.3",
										color: "teal.11",
										mb: "4",
									})}
								>
									<Icon className={css({ width: "6", height: "6" })} />
								</div>
								<Text
									as="h3"
									className={css({
										fontWeight: "semibold",
										fontSize: "lg",
										mb: "2",
									})}
								>
									{feature.title}
								</Text>
								<Text className={css({ color: "fg.muted", fontSize: "sm" })}>
									{feature.description}
								</Text>
							</div>
						);
					})}
				</div>
			</section>

			<section>
				<Text
					as="h2"
					className={css({
						fontSize: "2xl",
						fontWeight: "bold",
						mb: "6",
					})}
				>
					Examples
				</Text>
				<div
					className={css({
						display: "grid",
						gridTemplateColumns: { base: "1fr", lg: "repeat(2, 1fr)" },
						gap: "6",
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
								<Card.Root
									className={css({
										transition: "all 0.2s",
										cursor: "pointer",
										_hover: {
											borderColor: "teal.7",
											transform: "translateY(-2px)",
											boxShadow: "lg",
										},
									})}
								>
									<Card.Header>
										<div
											className={css({
												display: "flex",
												alignItems: "center",
												gap: "3",
											})}
										>
											<div
												className={css({
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													width: "10",
													height: "10",
													borderRadius: "lg",
													bg: "teal.3",
													color: "teal.11",
												})}
											>
												<Icon className={css({ width: "5", height: "5" })} />
											</div>
											<div className={css({ flex: "1" })}>
												<div
													className={css({
														display: "flex",
														alignItems: "center",
														gap: "2",
													})}
												>
													<Card.Title>{example.title}</Card.Title>
													<Badge variant="solid" colorPalette="green" size="sm">
														{example.status}
													</Badge>
												</div>
											</div>
											<ArrowRight
												className={css({
													width: "5",
													height: "5",
													color: "fg.subtle",
												})}
											/>
										</div>
									</Card.Header>
									<Card.Body>
										<Card.Description>{example.description}</Card.Description>
										<div
											className={css({
												display: "flex",
												gap: "2",
												mt: "4",
												flexWrap: "wrap",
											})}
										>
											{example.tags.map((tag) => (
												<Badge key={tag} variant="outline" size="sm">
													{tag}
												</Badge>
											))}
										</div>
									</Card.Body>
								</Card.Root>
							</Link>
						);
					})}
				</div>
			</section>
		</div>
	);
}
