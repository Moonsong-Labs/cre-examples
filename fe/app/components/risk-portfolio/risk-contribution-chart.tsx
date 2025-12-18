import { css } from "styled-system/css";
import { Tabs, Tooltip } from "~/components/ui";
import {
	ASSET_COLORS,
	ASSETS,
	computeRiskContribution,
	type RiskProfile,
} from "~/lib/risk-portfolio";

interface RiskContributionChartProps {
	cov: number[][];
	portfolios: {
		low: number[];
		balanced: number[];
		high: number[];
	};
}

function RiskBars({
	weights,
	riskContrib,
	portfolioVol,
}: {
	weights: number[];
	riskContrib: number[];
	portfolioVol: number;
}) {
	return (
		<div
			className={css({ display: "flex", flexDirection: "column", gap: "3" })}
		>
			<div className={css({ fontSize: "xs", color: "fg.muted", mb: "1" })}>
				Portfolio Volatility:{" "}
				<span className={css({ fontWeight: "semibold", color: "fg.default" })}>
					{(portfolioVol * 100).toFixed(1)}%
				</span>
			</div>

			{ASSETS.map((asset, i) => {
				const contrib = riskContrib[i] * 100;
				const weight = weights[i] * 100;

				return (
					<Tooltip
						key={asset}
						content={`${asset}: ${weight.toFixed(1)}% weight contributes ${contrib.toFixed(1)}% of portfolio risk`}
					>
						<div
							className={css({
								display: "flex",
								alignItems: "center",
								gap: "2",
							})}
						>
							<span
								className={css({
									width: "12",
									fontSize: "xs",
									color: "fg.muted",
									flexShrink: 0,
								})}
							>
								{asset}
							</span>

							<div
								className={css({
									flex: 1,
									height: "5",
									bg: "gray.3",
									borderRadius: "sm",
									overflow: "hidden",
								})}
							>
								<div
									className={css({
										height: "100%",
										borderRadius: "sm",
										transition: "width 0.3s ease",
									})}
									style={{
										width: `${Math.min(contrib, 100)}%`,
										backgroundColor: ASSET_COLORS[asset],
									}}
								/>
							</div>

							<span
								className={css({
									width: "14",
									fontSize: "xs",
									color: "fg.muted",
									textAlign: "right",
									flexShrink: 0,
								})}
							>
								{contrib.toFixed(1)}%
							</span>
						</div>
					</Tooltip>
				);
			})}
		</div>
	);
}

export function RiskContributionChart({
	cov,
	portfolios,
}: RiskContributionChartProps) {
	const profiles: { key: RiskProfile; label: string }[] = [
		{ key: "low", label: "Low Risk" },
		{ key: "balanced", label: "Balanced" },
		{ key: "high", label: "High Risk" },
	];

	const contributions = {
		low: computeRiskContribution(cov, portfolios.low),
		balanced: computeRiskContribution(cov, portfolios.balanced),
		high: computeRiskContribution(cov, portfolios.high),
	};

	return (
		<div
			className={css({ display: "flex", flexDirection: "column", gap: "3" })}
		>
			<span
				className={css({
					fontSize: "sm",
					fontWeight: "semibold",
					color: "fg.default",
				})}
			>
				Risk Contribution
			</span>

			<Tabs.Root defaultValue="balanced" variant="enclosed" size="sm">
				<Tabs.List>
					{profiles.map((profile) => (
						<Tabs.Trigger key={profile.key} value={profile.key}>
							{profile.label}
						</Tabs.Trigger>
					))}
					<Tabs.Indicator />
				</Tabs.List>

				{profiles.map((profile) => {
					const data = contributions[profile.key];
					return (
						<Tabs.Content
							key={profile.key}
							value={profile.key}
							className={css({ pt: "4" })}
						>
							<RiskBars
								weights={data.weights}
								riskContrib={data.riskContrib}
								portfolioVol={data.portfolioVol}
							/>
						</Tabs.Content>
					);
				})}
			</Tabs.Root>
		</div>
	);
}
