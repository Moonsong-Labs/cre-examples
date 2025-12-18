import { Fragment } from "react";
import { css } from "styled-system/css";
import { Tooltip } from "~/components/ui";
import { ASSETS, buildCorrelationMatrix } from "~/lib/risk-portfolio";

interface CorrelationHeatmapProps {
	corrBps: number[];
}

function getCorrelationColor(rho: number): string {
	const clamped = Math.max(-1, Math.min(1, rho));
	if (clamped < 0) {
		const intensity = Math.round(255 * (1 + clamped));
		return `rgb(255, ${intensity}, ${intensity})`;
	}
	const intensity = Math.round(255 * (1 - clamped));
	return `rgb(${intensity}, 255, ${intensity})`;
}

export function CorrelationHeatmap({ corrBps }: CorrelationHeatmapProps) {
	const matrix = buildCorrelationMatrix(corrBps);

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
				Correlation Matrix
			</span>

			<div
				className={css({
					display: "grid",
					gridTemplateColumns: "auto repeat(5, 1fr)",
					gap: "1",
					fontSize: "xs",
				})}
			>
				<div />
				{ASSETS.map((asset) => (
					<div
						key={`header-${asset}`}
						className={css({
							textAlign: "center",
							fontWeight: "medium",
							color: "fg.muted",
							py: "1",
						})}
					>
						{asset}
					</div>
				))}

				{ASSETS.map((rowAsset, i) => (
					<Fragment key={`row-${rowAsset}`}>
						<div
							className={css({
								fontWeight: "medium",
								color: "fg.muted",
								pr: "2",
								display: "flex",
								alignItems: "center",
							})}
						>
							{rowAsset}
						</div>
						{ASSETS.map((colAsset, j) => {
							const value = matrix[i][j];
							const displayValue = value.toFixed(2);

							return (
								<Tooltip
									key={`cell-${rowAsset}-${colAsset}`}
									content={`${rowAsset}-${colAsset}: ${displayValue}`}
								>
									<div
										className={css({
											aspectRatio: "1",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											borderRadius: "sm",
											cursor: "default",
											fontWeight: i === j ? "bold" : "normal",
											color: Math.abs(value) > 0.5 ? "white" : "fg.default",
											minHeight: "8",
										})}
										style={{ backgroundColor: getCorrelationColor(value) }}
									>
										{displayValue}
									</div>
								</Tooltip>
							);
						})}
					</Fragment>
				))}
			</div>

			<div
				className={css({
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					gap: "2",
					fontSize: "xs",
					color: "fg.muted",
				})}
			>
				<span>-1</span>
				<div
					className={css({
						width: "32",
						height: "3",
						borderRadius: "sm",
						background:
							"linear-gradient(to right, rgb(255, 0, 0), rgb(255, 255, 255), rgb(0, 255, 0))",
					})}
				/>
				<span>+1</span>
			</div>
		</div>
	);
}
