import type { ReactNode } from "react";
import { css } from "styled-system/css";
import { Heading, Text } from "~/components/ui";

interface ExamplePageProps {
	title: string;
	description: string;
	actions?: ReactNode;
	children: ReactNode;
	accent?: {
		glow: string;
		wash: string;
		edge?: string;
		surface?: string;
		surfaceStrong?: string;
	};
}

const defaultAccent = {
	glow: "rgba(110, 59, 216, 0.18)",
	wash: "rgba(165, 243, 252, 0.22)",
	edge: "rgba(143, 96, 250, 0.18)",
	surface: "rgba(241, 242, 255, 0.84)",
	surfaceStrong: "rgba(229, 240, 247, 0.94)",
};

export function ExamplePage({
	title,
	description,
	actions,
	children,
	accent = defaultAccent,
}: ExamplePageProps) {
	return (
		<div
			className={css({
				position: "relative",
				"--example-glow": accent.glow,
				"--example-wash": accent.wash,
				"--example-edge": accent.edge ?? defaultAccent.edge,
				"--example-surface": accent.surface ?? defaultAccent.surface,
				"--example-surface-strong":
					accent.surfaceStrong ?? defaultAccent.surfaceStrong,
				maxWidth: "88rem",
				mx: "auto",
				px: { base: "4", md: "6", xl: "8" },
				py: { base: "6", md: "8" },
				display: "flex",
				flexDirection: "column",
				gap: { base: "8", md: "10" },
			})}
		>
			<section
				className={css({
					position: "relative",
					overflow: "hidden",
					borderRadius: "32px",
					px: { base: "5", md: "7", xl: "8" },
					py: { base: "5", md: "6", xl: "7" },
					bg: "linear-gradient(160deg, rgba(255,255,255,0.92) 0%, var(--example-surface) 100%)",
					backdropFilter: "blur(24px) saturate(120%)",
					boxShadow:
						"0 42px 96px -44px rgba(44,52,55,0.14), inset 0 1px 0 rgba(255,255,255,0.78)",
					_before: {
						content: '""',
						position: "absolute",
						inset: 0,
						background:
							"radial-gradient(circle at 12% 18%, var(--example-glow), transparent 34%), radial-gradient(circle at 86% 14%, var(--example-wash), transparent 32%), linear-gradient(135deg, rgba(247,249,251,0.88), rgba(255,255,255,0))",
						pointerEvents: "none",
					},
				})}
			>
				<div
					className={css({
						position: "relative",
						zIndex: 1,
						display: "flex",
						flexDirection: "column",
						gap: "4",
						alignItems: "start",
					})}
				>
					<div
						className={css({
							display: "grid",
							gridTemplateColumns: { base: "1fr", lg: "minmax(0, 1fr) auto" },
							gap: { base: "4", lg: "6" },
							alignItems: "end",
							width: "full",
						})}
					>
						<div
							className={css({
								display: "flex",
								flexDirection: "column",
								gap: "3",
							})}
						>
							<Heading
								as="h1"
								className={css({
									fontFamily: '"Manrope", sans-serif',
									fontSize: { base: "4xl", md: "5xl", xl: "6xl" },
									lineHeight: { base: "1.04", md: "1" },
									letterSpacing: "-0.03em",
									fontWeight: "800",
									maxW: { base: "9ch", md: "14ch", xl: "16ch" },
									color: "#2c3437",
								})}
							>
								{title}
							</Heading>
							<Text
								className={css({
									maxW: "56rem",
									fontSize: { base: "md", md: "lg" },
									lineHeight: "1.65",
									letterSpacing: "0.01em",
									color: "rgba(44,52,55,0.72)",
								})}
							>
								{description}
							</Text>
						</div>

						<div
							className={css({
								display: "flex",
								justifyContent: { lg: "flex-end" },
								alignItems: { base: "flex-start", lg: "center" },
							})}
						>
							{actions && (
								<div
									className={css({
										display: "flex",
										flexWrap: "wrap",
										justifyContent: { lg: "flex-end" },
										gap: "2.5",
									})}
								>
									{actions}
								</div>
							)}
						</div>
					</div>
				</div>
			</section>

			<div
				className={css({
					display: "flex",
					flexDirection: "column",
					gap: { base: "8", md: "10" },
				})}
			>
				{children}
			</div>
		</div>
	);
}
