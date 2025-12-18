import { RotateCcw, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { css } from "styled-system/css";
import { Button, Slider, Text, Tooltip } from "~/components/ui";
import { ASSETS, ASSET_COLORS, type RiskProfile } from "~/lib/risk-portfolio";

interface PriceSimulationProps {
	portfolios: {
		low: number[];
		balanced: number[];
		high: number[];
	};
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

export function PriceSimulation({ portfolios }: PriceSimulationProps) {
	const [priceChanges, setPriceChanges] = useState<number[]>([0, 0, 0, 0, 0]);

	const handlePriceChange = (index: number, value: number) => {
		setPriceChanges((prev) => {
			const next = [...prev];
			next[index] = value;
			return next;
		});
	};

	const resetAll = () => {
		setPriceChanges([0, 0, 0, 0, 0]);
	};

	const profiles: { key: RiskProfile; label: string }[] = [
		{ key: "low", label: "Low Risk" },
		{ key: "balanced", label: "Balanced" },
		{ key: "high", label: "High Risk" },
	];

	const returns = {
		low: calculatePortfolioReturn(portfolios.low, priceChanges),
		balanced: calculatePortfolioReturn(portfolios.balanced, priceChanges),
		high: calculatePortfolioReturn(portfolios.high, priceChanges),
	};

	return (
		<div className={css({ display: "flex", flexDirection: "column", gap: "5" })}>
			<div
				className={css({
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				})}
			>
				<div>
					<Text
						className={css({
							fontSize: "sm",
							fontWeight: "semibold",
							color: "fg.default",
						})}
					>
						Price Simulation
					</Text>
					<Text className={css({ fontSize: "xs", color: "fg.muted" })}>
						Adjust asset prices to see portfolio impact
					</Text>
				</div>
				<Button onClick={resetAll} variant="outline" size="sm">
					<RotateCcw className={css({ width: "3.5", height: "3.5" })} />
					Reset
				</Button>
			</div>

			{/* Price Sliders */}
			<div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
				{ASSETS.map((asset, i) => (
					<div key={asset}>
						<Slider.Root
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
										fontSize: "xs",
										fontWeight: "medium",
										color: "fg.muted",
									})}
								>
									{asset}
								</Slider.Label>
								<span
									className={css({
										fontSize: "xs",
										fontWeight: "semibold",
										minWidth: "12",
										textAlign: "right",
									})}
									style={{ color: `var(--colors-${getReturnColor(priceChanges[i])})` }}
								>
									{formatPercent(priceChanges[i])}
								</span>
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
					</div>
				))}
			</div>

			{/* Portfolio Returns */}
			<div
				className={css({
					display: "grid",
					gridTemplateColumns: "repeat(3, 1fr)",
					gap: "3",
					pt: "2",
					borderTop: "1px solid",
					borderColor: "border",
				})}
			>
				{profiles.map((profile) => {
					const ret = returns[profile.key];
					const Icon = ret >= 0 ? TrendingUp : TrendingDown;

					return (
						<Tooltip
							key={profile.key}
							content={`${profile.label} portfolio ${ret >= 0 ? "gains" : "loses"} ${Math.abs(ret).toFixed(2)}%`}
						>
							<div
								className={css({
									p: "3",
									borderRadius: "lg",
									border: "1px solid",
									borderColor: "border",
									bg: "gray.subtle.bg",
									textAlign: "center",
									cursor: "default",
								})}
							>
								<Text
									className={css({
										fontSize: "xs",
										color: "fg.muted",
										mb: "1",
									})}
								>
									{profile.label}
								</Text>
								<div
									className={css({
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										gap: "1",
									})}
								>
									<Icon
										className={css({ width: "4", height: "4" })}
										style={{ color: `var(--colors-${getReturnColor(ret)})` }}
									/>
									<Text
										className={css({
											fontSize: "lg",
											fontWeight: "bold",
										})}
										style={{ color: `var(--colors-${getReturnColor(ret)})` }}
									>
										{formatPercent(ret)}
									</Text>
								</div>
							</div>
						</Tooltip>
					);
				})}
			</div>
		</div>
	);
}
