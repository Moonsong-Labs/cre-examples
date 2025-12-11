import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { css } from "styled-system/css";
import { FloatingLines } from "~/components/backgrounds/floating-lines";
import { GlassSurface } from "~/components/glass-surface";
import { Button, Heading } from "~/components/ui";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
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
					maxWidth: "2xl",
					mx: "6",
					position: "relative",
					zIndex: 1,
				})}
			>
				<div
					className={css({
						textAlign: "center",
						py: "16",
						px: "8",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: "8",
					})}
				>
					<Heading
						as="h1"
						textStyle="7xl"
						className={css({
							color: "white",
							fontWeight: "900",
						})}
					>
						CRE Examples
					</Heading>

					<Link to="/examples/cross-chain-relayer">
						<Button size="xl">
							Get Started
							<ArrowRight className={css({ width: "5", height: "5", ml: "2" })} />
						</Button>
					</Link>
				</div>
			</GlassSurface>
		</div>
	);
}
