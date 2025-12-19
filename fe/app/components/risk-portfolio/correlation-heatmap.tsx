import { Activity, Link, ShieldCheck } from "lucide-react";
import { Fragment } from "react";
import { css } from "styled-system/css";
import { Badge, Tooltip } from "~/components/ui";
import { ASSETS, buildCorrelationMatrix } from "~/lib/risk-portfolio";

interface CorrelationHeatmapProps {
	corrBps: number[];
}

function getCorrelationColor(rho: number): string {
	const clamped = Math.max(-1, Math.min(1, rho));

	// Cool-Warm diverging colormap (Moreland) - perceptually uniform, colorblind safe
	const stops: [number, [number, number, number]][] = [
		[-1.0, [59, 76, 192]],
		[-0.5, [141, 176, 254]],
		[0.0, [221, 221, 221]],
		[0.5, [241, 141, 111]],
		[1.0, [180, 4, 38]],
	];

	for (let i = 0; i < stops.length - 1; i++) {
		const [v0, c0] = stops[i];
		const [v1, c1] = stops[i + 1];

		if (clamped >= v0 && clamped <= v1) {
			const t = (clamped - v0) / (v1 - v0);
			const r = Math.round(c0[0] + t * (c1[0] - c0[0]));
			const g = Math.round(c0[1] + t * (c1[1] - c0[1]));
			const b = Math.round(c0[2] + t * (c1[2] - c0[2]));
			return `rgb(${r}, ${g}, ${b})`;
		}
	}

	return "rgb(221, 221, 221)";
}

export function CorrelationHeatmap({ corrBps }: CorrelationHeatmapProps) {
	const matrix = buildCorrelationMatrix(corrBps);

	// Calculate insights
	let maxCorr = -2;
	let maxPair = ["-", "-"];
	let minCorr = 2;
	let minPair = ["-", "-"];
	let sumAbsCorr = 0;
	let count = 0;

	for (let i = 0; i < ASSETS.length; i++) {
		for (let j = 0; j < i; j++) {
			const val = matrix[i][j];
			if (val > maxCorr) {
				maxCorr = val;
				maxPair = [ASSETS[j], ASSETS[i]];
			}
			if (val < minCorr) {
				minCorr = val;
				minPair = [ASSETS[j], ASSETS[i]];
			}
			sumAbsCorr += Math.abs(val);
			count++;
		}
	}
	const avgCorr = count > 0 ? sumAbsCorr / count : 0;

	return (
		<div
			className={css({ display: "flex", flexDirection: "column", gap: "6" })}
		>
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
						gap: "2",
						fontSize: "sm",
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
								const isDiagonal = i === j;
								const isUpperTriangle = j > i;

								return (
									<div
										key={`cell-${rowAsset}-${colAsset}`}
										className={css({
											width: "10",
											height: "10",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											borderRadius: "md",
											cursor: "default",
											fontWeight: isDiagonal ? "normal" : "medium",
											color: isDiagonal
												? "fg.muted"
												: Math.abs(value) > 0.5
													? "white"
													: "fg.default",
											visibility: isUpperTriangle ? "hidden" : "visible",
											bg: isDiagonal ? "gray.subtle.bg" : undefined,
										})}
										style={{
											backgroundColor: isDiagonal
												? undefined
												: getCorrelationColor(value),
										}}
									>
										{!isUpperTriangle && (
											<Tooltip
												content={`${rowAsset}-${colAsset}: ${displayValue}`}
											>
												<span>{displayValue}</span>
											</Tooltip>
										)}
									</div>
								);
							})}
						</Fragment>
					))}
				</div>
			</div>

			{/* Market Insights Gadget */}
			<div
				className={css({
					display: "grid",
					gridTemplateColumns: "1fr 1fr 1fr",
					gap: "3",
				})}
			>
				<InsightCard
					icon={Link}
					label="Strongest"
					subLabel={maxPair.join("-")}
					value={maxCorr.toFixed(2)}
					colorPalette="red"
				/>
				<InsightCard
					icon={ShieldCheck}
					label="Lowest"
					subLabel={minPair.join("-")}
					value={minCorr.toFixed(2)}
					colorPalette="teal"
				/>
				<InsightCard
					icon={Activity}
					label="Cohesion"
					subLabel="Avg Abs"
					value={avgCorr.toFixed(2)}
					colorPalette="blue"
				/>
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
						background: `linear-gradient(to right,
								rgb(59, 76, 192) 0%,
								rgb(98, 130, 234) 12.5%,
								rgb(141, 176, 254) 25%,
								rgb(184, 208, 249) 37.5%,
								rgb(221, 221, 221) 50%,
								rgb(245, 196, 173) 62.5%,
								rgb(241, 141, 111) 75%,
								rgb(222, 96, 77) 87.5%,
								rgb(180, 4, 38) 100%
							)`,
					})}
				/>
				<span>+1</span>
			</div>
		</div>
	);
}

function InsightCard({
	icon: Icon,
	label,
	subLabel,
	value,
	colorPalette,
}: {
	icon: React.ElementType;
	label: string;
	subLabel: string;
	value: string;
	colorPalette: "red" | "teal" | "blue";
}) {
	return (
		<div
			className={css({
				bg: "gray.subtle.bg",
				borderRadius: "md",
				p: "2.5",
				display: "flex",
				flexDirection: "column",
				gap: "2",
				border: "1px solid",
				borderColor: "border",
			})}
		>
			<div
				className={css({
					display: "flex",
					alignItems: "center",
					gap: "1.5",
					color: "fg.muted",
					fontSize: "xs",
				})}
			>
				<Icon className={css({ width: "3.5", height: "3.5" })} />
				<span className={css({ fontWeight: "medium" })}>{label}</span>
			</div>
			<div>
				<div
					className={css({
						fontSize: "lg",
						fontWeight: "bold",
						lineHeight: "1",
						color: {
							base: `${colorPalette}.9`,
							_dark: `${colorPalette}.3`,
						},
						mb: "2",
					})}
				>
					{value}
				</div>
				<Badge colorPalette={colorPalette} variant="surface" size="sm">
					{subLabel}
				</Badge>
			</div>
		</div>
	);
}
