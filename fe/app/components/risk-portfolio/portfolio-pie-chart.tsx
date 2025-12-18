import { css } from "styled-system/css";
import { ASSET_COLORS, ASSETS, type Asset } from "~/lib/risk-portfolio";

interface PortfolioPieChartProps {
	title: string;
	weights: number[];
	size?: number;
}

function polarToCartesian(
	cx: number,
	cy: number,
	r: number,
	angle: number,
): { x: number; y: number } {
	const rad = ((angle - 90) * Math.PI) / 180;
	return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
	cx: number,
	cy: number,
	r: number,
	startAngle: number,
	endAngle: number,
): string {
	const start = polarToCartesian(cx, cy, r, endAngle);
	const end = polarToCartesian(cx, cy, r, startAngle);
	const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
	return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export function PortfolioPieChart({
	title,
	weights,
	size = 180,
}: PortfolioPieChartProps) {
	const cx = size / 2;
	const cy = size / 2;
	const r = size / 2 - 4;

	let currentAngle = 0;
	const slices = weights.map((weight, i) => {
		const angle = weight * 360;
		const startAngle = currentAngle;
		const endAngle = currentAngle + angle;
		currentAngle = endAngle;

		if (weight < 0.005) return null;

		return {
			path: describeArc(cx, cy, r, startAngle, endAngle),
			color: ASSET_COLORS[ASSETS[i]],
			asset: ASSETS[i],
			weight,
		};
	});

	return (
		<div
			className={css({
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: "3",
			})}
		>
			<span
				className={css({
					fontSize: "sm",
					fontWeight: "semibold",
					color: "fg.default",
				})}
			>
				{title}
			</span>

			<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
				{slices.map(
					(slice, i) =>
						slice && (
							<path
								key={ASSETS[i]}
								d={slice.path}
								fill={slice.color}
								stroke="var(--colors-bg-default)"
								strokeWidth="2"
							/>
						),
				)}
			</svg>

			<div
				className={css({
					display: "flex",
					flexWrap: "wrap",
					gap: "2",
					justifyContent: "center",
					maxWidth: `${size + 40}px`,
				})}
			>
				{ASSETS.map((asset, i) => (
					<div
						key={asset}
						className={css({
							display: "flex",
							alignItems: "center",
							gap: "1.5",
							fontSize: "xs",
						})}
					>
						<div
							className={css({
								width: "2.5",
								height: "2.5",
								borderRadius: "sm",
							})}
							style={{ backgroundColor: ASSET_COLORS[asset] }}
						/>
						<span className={css({ color: "fg.muted" })}>
							{asset} {(weights[i] * 100).toFixed(1)}%
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
