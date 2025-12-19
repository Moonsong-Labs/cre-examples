import { css } from "styled-system/css";
import { Tooltip } from "~/components/ui";
import { ASSET_COLORS, ASSETS } from "~/lib/risk-portfolio";

interface VolatilityBarChartProps {
	volBps: number[];
}

export function VolatilityBarChart({ volBps }: VolatilityBarChartProps) {
	const maxVol = Math.max(...volBps, 10000);

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
				Annualized Volatility
			</span>

			<div
				className={css({ display: "flex", flexDirection: "column", gap: "2" })}
			>
				{ASSETS.map((asset, i) => {
					const vol = volBps[i];
					const percent = (vol / 100).toFixed(1);
					const width = (vol / maxVol) * 100;

					return (
						<Tooltip
							key={asset}
							content={`${asset}: ${percent}% annualized volatility`}
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
											width: `${width}%`,
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
									{percent}%
								</span>
							</div>
						</Tooltip>
					);
				})}
			</div>
		</div>
	);
}
