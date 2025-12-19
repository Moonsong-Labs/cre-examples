import {
	RotateCcw,
	Shuffle,
	Snowflake,
	Sparkles,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { css } from "styled-system/css";
import { Button, Slider, Text } from "~/components/ui";
import { ASSET_COLORS, ASSETS } from "~/lib/risk-portfolio";

interface PriceSimulationProps {
	portfolios: {
		low: number[];
		balanced: number[];
		high: number[];
	};
	onReset?: () => void;
}

function calculatePortfolioReturn(
	weights: number[],
	priceChanges: number[],
): number {
	return weights.reduce((sum, w, i) => sum + w * priceChanges[i], 0);
}

function formatPercent(value: number): string {
	const sign = value >= 0 ? "+" : "";
	return `${sign}${value.toFixed(1)}%`;
}

function getReturnColor(value: number): string {
	if (value > 0) return "green.11";
	if (value < 0) return "red.11";
	return "fg.muted";
}

function DivergingBar({
	label,
	value,
	maxValue = 30,
}: {
	label: string;
	value: number;
	maxValue?: number;
}) {
	// Clamp value for visualization
	const clampedValue = Math.max(-maxValue, Math.min(maxValue, value));
	const percentage = (Math.abs(clampedValue) / maxValue) * 50; // 0 to 50%
	const isPositive = value >= 0;

	return (
		<div
			className={css({
				display: "flex",
				alignItems: "center",
				gap: "4",
				fontSize: "sm",
			})}
		>
			<div className={css({ width: "24", fontWeight: "medium" })}>{label}</div>
			<div
				className={css({
					flex: "1",
					display: "flex",
					position: "relative",
					height: "8",
					alignItems: "center",
					bg: "gray.subtle.bg",
					borderRadius: "md",
					overflow: "hidden",
				})}
			>
				{/* Center Line */}
				<div
					className={css({
						position: "absolute",
						left: "50%",
						top: "0",
						bottom: "0",
						width: "1px",
						bg: "border",
						zIndex: "1",
					})}
				/>

				{/* Bar */}
				<div
					style={{
						position: "absolute",
						left: isPositive ? "50%" : undefined,
						right: isPositive ? undefined : "50%",
						width: `${percentage}%`,
						height: "100%",
						backgroundColor: isPositive
							? "var(--colors-green-9)"
							: "var(--colors-red-9)",
						opacity: 0.8,
						transition: "width 0.3s ease",
					}}
				/>

				{/* Value Text */}
				<div
					className={css({
						position: "absolute",
						width: "100%",
						textAlign: isPositive ? "left" : "right",
						pl: isPositive ? "calc(50% + 8px)" : 0,
						pr: isPositive ? 0 : "calc(50% + 8px)",
						fontWeight: "bold",
						fontSize: "xs",
						zIndex: "2",
					})}
					style={{
						color: isPositive
							? "var(--colors-green-11)"
							: "var(--colors-red-11)",
					}}
				>
					{formatPercent(value)}
				</div>
			</div>
		</div>
	);
}

export function PriceSimulation({ portfolios, onReset }: PriceSimulationProps) {
	const [priceChanges, setPriceChanges] = useState<number[]>([0, 0, 0, 0, 0]);

	const handlePriceChange = (index: number, value: number) => {
		setPriceChanges((prev) => {
			const next = [...prev];
			next[index] = value;
			return next;
		});
	};

	const applyScenario = (type: "winter" | "alts" | "recovery" | "shuffle") => {
		let newChanges: number[] = [];

		switch (type) {
			case "winter":
				// BTC down, Alts down hard
				newChanges = [-25, -45, -50, 0, -55];
				break;
			case "alts":
				// BTC flat/up, Alts moon
				newChanges = [5, 45, 30, 0, 60];
				break;
			case "recovery":
				// Broad recovery
				newChanges = [15, 20, 18, 0, 25];
				break;
			case "shuffle":
				newChanges = ASSETS.map((a) => {
					if (a === "sDAI") return 0; // Stablecoin mostly stable
					return Math.floor(Math.random() * 101) - 50; // -50 to 50
				});
				break;
		}
		setPriceChanges(newChanges);
	};

	const resetAll = () => {
		setPriceChanges([0, 0, 0, 0, 0]);
		onReset?.();
	};

	const returns = {
		low: calculatePortfolioReturn(portfolios.low, priceChanges),
		balanced: calculatePortfolioReturn(portfolios.balanced, priceChanges),
		high: calculatePortfolioReturn(portfolios.high, priceChanges),
	};

	const hasChanges = priceChanges.some((v) => v !== 0);

	return (
		<div
			className={css({ display: "flex", flexDirection: "column", gap: "6" })}
		>
			{/* Scenarios & Controls */}
			<div
				className={css({
					display: "flex",
					justifyContent: "space-between",
					gap: "2",
					flexWrap: "wrap",
				})}
			>
				<div className={css({ display: "flex", gap: "2" })}>
					<Button
						variant="outline"
						size="sm"
						onClick={() => applyScenario("winter")}
						title="Crypto Winter"
					>
						<Snowflake className={css({ width: "4", height: "4" })} />
						<span className={css({ display: { base: "none", sm: "inline" } })}>
							Winter
						</span>
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => applyScenario("alts")}
						title="Alt Season"
					>
						<Sparkles className={css({ width: "4", height: "4" })} />
						<span className={css({ display: { base: "none", sm: "inline" } })}>
							Alts
						</span>
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => applyScenario("recovery")}
						title="Recovery"
					>
						<TrendingUp className={css({ width: "4", height: "4" })} />
						<span className={css({ display: { base: "none", sm: "inline" } })}>
							Bull
						</span>
					</Button>
					<Button
						variant="plain"
						size="sm"
						onClick={() => applyScenario("shuffle")}
						title="Shuffle"
					>
						<Shuffle className={css({ width: "4", height: "4" })} />
					</Button>
				</div>
				{hasChanges && (
					<Button onClick={resetAll} variant="subtle" size="sm">
						<RotateCcw className={css({ width: "4", height: "4" })} />
						Reset
					</Button>
				)}
			</div>

			{/* Price Sliders */}
			<div
				className={css({
					display: "grid",
					gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
					columnGap: "8",
					rowGap: "4",
				})}
			>
				{ASSETS.map((asset, i) => (
					<Slider.Root
						key={asset}
						min={-50}
						max={50}
						step={1}
						value={[priceChanges[i]]}
						onValueChange={(details) => handlePriceChange(i, details.value[0])}
					>
						<div
							className={css({
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								mb: "1",
							})}
						>
							<Slider.Label
								className={css({
									fontSize: "sm",
									fontWeight: "medium",
									minWidth: "12",
								})}
							>
								{asset}
							</Slider.Label>
							<Slider.ValueText
								className={css({
									fontSize: "sm",
									fontWeight: "semibold",
									minWidth: "14",
									textAlign: "right",
								})}
								style={{
									color: `var(--colors-${getReturnColor(priceChanges[i])})`,
								}}
							>
								{formatPercent(priceChanges[i])}
							</Slider.ValueText>
						</div>
						<Slider.Control>
							<Slider.Track>
								<Slider.Range
									style={{ backgroundColor: ASSET_COLORS[asset] }}
								/>
							</Slider.Track>
							<Slider.Thumbs />
						</Slider.Control>
					</Slider.Root>
				))}
			</div>

			{/* Performance Visualization */}
			<div
				className={css({
					display: "flex",
					flexDirection: "column",
					gap: "4",
					pt: "4",
					borderTop: "1px solid",
					borderColor: "border",
				})}
			>
				<Text className={css({ fontWeight: "semibold", fontSize: "sm" })}>
					Estimated Performance
				</Text>
				<div
					className={css({
						display: "flex",
						flexDirection: "column",
						gap: "3",
					})}
				>
					<DivergingBar label="Low Risk" value={returns.low} />
					<DivergingBar label="Balanced" value={returns.balanced} />
					<DivergingBar label="High Risk" value={returns.high} />
				</div>
			</div>
		</div>
	);
}
