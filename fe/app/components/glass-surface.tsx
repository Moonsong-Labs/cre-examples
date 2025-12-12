import {
	type CSSProperties,
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useRef,
} from "react";
import { css } from "styled-system/css";

interface GlassSurfaceProps {
	children: ReactNode;
	width?: number | string;
	height?: number | string;
	borderRadius?: number;
	borderWidth?: number;
	brightness?: number;
	opacity?: number;
	blur?: number;
	displace?: number;
	backgroundOpacity?: number;
	saturation?: number;
	distortionScale?: number;
	redOffset?: number;
	greenOffset?: number;
	blueOffset?: number;
	xChannel?: "R" | "G" | "B" | "A";
	yChannel?: "R" | "G" | "B" | "A";
	mixBlendMode?: string;
	className?: string;
	style?: CSSProperties;
}

export function GlassSurface({
	children,
	width = 200,
	height = 80,
	borderRadius = 20,
	borderWidth = 0.07,
	brightness = 50,
	opacity = 0.93,
	blur = 11,
	displace = 0,
	backgroundOpacity = 0,
	saturation = 1,
	distortionScale = -180,
	redOffset = 0,
	greenOffset = 10,
	blueOffset = 20,
	xChannel = "R",
	yChannel = "G",
	mixBlendMode = "difference",
	className = "",
	style = {},
}: GlassSurfaceProps) {
	const uniqueId = useId().replace(/:/g, "-");
	const filterId = `glass-filter-${uniqueId}`;
	const redGradId = `red-grad-${uniqueId}`;
	const blueGradId = `blue-grad-${uniqueId}`;

	const containerRef = useRef<HTMLDivElement>(null);
	const feImageRef = useRef<SVGFEImageElement>(null);
	const redChannelRef = useRef<SVGFEDisplacementMapElement>(null);
	const greenChannelRef = useRef<SVGFEDisplacementMapElement>(null);
	const blueChannelRef = useRef<SVGFEDisplacementMapElement>(null);
	const gaussianBlurRef = useRef<SVGFEGaussianBlurElement>(null);

	const generateDisplacementMap = useCallback(() => {
		const rect = containerRef.current?.getBoundingClientRect();
		const actualWidth = rect?.width || 400;
		const actualHeight = rect?.height || 200;
		const edgeSize = Math.min(actualWidth, actualHeight) * (borderWidth * 0.5);

		const svgContent = `
      <svg viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="red"/>
          </linearGradient>
          <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="blue"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="black"></rect>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${redGradId})" />
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${blueGradId})" style="mix-blend-mode: ${mixBlendMode}" />
        <rect x="${edgeSize}" y="${edgeSize}" width="${actualWidth - edgeSize * 2}" height="${actualHeight - edgeSize * 2}" rx="${borderRadius}" fill="hsl(0 0% ${brightness}% / ${opacity})" style="filter:blur(${blur}px)" />
      </svg>
    `;

		return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
	}, [
		borderWidth,
		borderRadius,
		redGradId,
		blueGradId,
		mixBlendMode,
		brightness,
		opacity,
		blur,
	]);

	const updateDisplacementMap = useCallback(() => {
		feImageRef.current?.setAttribute("href", generateDisplacementMap());
	}, [generateDisplacementMap]);

	useEffect(() => {
		updateDisplacementMap();
		[
			{ ref: redChannelRef, offset: redOffset },
			{ ref: greenChannelRef, offset: greenOffset },
			{ ref: blueChannelRef, offset: blueOffset },
		].forEach(({ ref, offset }) => {
			if (ref.current) {
				ref.current.setAttribute(
					"scale",
					(distortionScale + offset).toString(),
				);
				ref.current.setAttribute("xChannelSelector", xChannel);
				ref.current.setAttribute("yChannelSelector", yChannel);
			}
		});

		gaussianBlurRef.current?.setAttribute("stdDeviation", displace.toString());
	}, [
		updateDisplacementMap,
		displace,
		distortionScale,
		redOffset,
		greenOffset,
		blueOffset,
		xChannel,
		yChannel,
	]);

	useEffect(() => {
		if (!containerRef.current) return;

		const resizeObserver = new ResizeObserver(() => {
			setTimeout(updateDisplacementMap, 0);
		});

		resizeObserver.observe(containerRef.current);

		return () => {
			resizeObserver.disconnect();
		};
	}, [updateDisplacementMap]);

	const supportsSVGFilters = () => {
		if (typeof navigator === "undefined") return false;
		const isWebkit =
			/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
		const isFirefox = /Firefox/.test(navigator.userAgent);

		if (isWebkit || isFirefox) {
			return false;
		}

		const div = document.createElement("div");
		div.style.backdropFilter = `url(#${filterId})`;
		return div.style.backdropFilter !== "";
	};

	const containerStyle: CSSProperties = {
		...style,
		width: typeof width === "number" ? `${width}px` : width,
		height: typeof height === "number" ? `${height}px` : height,
		borderRadius: `${borderRadius}px`,
		// @ts-expect-error CSS custom properties
		"--glass-frost": backgroundOpacity,
		"--glass-saturation": saturation,
		"--filter-id": `url(#${filterId})`,
	};

	const isSvgSupported =
		typeof window !== "undefined" ? supportsSVGFilters() : false;

	return (
		<div
			ref={containerRef}
			className={`${css({
				position: "relative",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				overflow: "hidden",
				transition: "opacity 0.26s ease-out",
			})} ${isSvgSupported ? svgStyles : fallbackStyles} ${className}`}
			style={containerStyle}
		>
			<svg
				className={css({
					width: "100%",
					height: "100%",
					pointerEvents: "none",
					position: "absolute",
					inset: 0,
					opacity: 0,
					zIndex: -1,
				})}
				aria-hidden="true"
				xmlns="http://www.w3.org/2000/svg"
			>
				<defs>
					<filter
						id={filterId}
						colorInterpolationFilters="sRGB"
						x="0%"
						y="0%"
						width="100%"
						height="100%"
					>
						<feImage
							ref={feImageRef}
							x="0"
							y="0"
							width="100%"
							height="100%"
							preserveAspectRatio="none"
							result="map"
						/>

						<feDisplacementMap
							ref={redChannelRef}
							in="SourceGraphic"
							in2="map"
							id="redchannel"
							result="dispRed"
						/>
						<feColorMatrix
							in="dispRed"
							type="matrix"
							values="1 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
							result="red"
						/>

						<feDisplacementMap
							ref={greenChannelRef}
							in="SourceGraphic"
							in2="map"
							id="greenchannel"
							result="dispGreen"
						/>
						<feColorMatrix
							in="dispGreen"
							type="matrix"
							values="0 0 0 0 0
                      0 1 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
							result="green"
						/>

						<feDisplacementMap
							ref={blueChannelRef}
							in="SourceGraphic"
							in2="map"
							id="bluechannel"
							result="dispBlue"
						/>
						<feColorMatrix
							in="dispBlue"
							type="matrix"
							values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
							result="blue"
						/>

						<feBlend in="red" in2="green" mode="screen" result="rg" />
						<feBlend in="rg" in2="blue" mode="screen" result="output" />
						<feGaussianBlur
							ref={gaussianBlurRef}
							in="output"
							stdDeviation="0.7"
						/>
					</filter>
				</defs>
			</svg>

			<div
				className={css({
					width: "100%",
					height: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					p: "2",
					borderRadius: "inherit",
					position: "relative",
					zIndex: 1,
				})}
			>
				{children}
			</div>
		</div>
	);
}

const svgStyles = css({
	bg: "hsl(0 0% 0% / var(--glass-frost, 0))",
	backdropFilter:
		"var(--filter-id, url(#glass-filter)) saturate(var(--glass-saturation, 1))",
	boxShadow: `
    0 0 2px 1px color-mix(in oklch, white, transparent 65%) inset,
    0 0 10px 4px color-mix(in oklch, white, transparent 85%) inset,
    0px 4px 16px rgba(17, 17, 26, 0.05),
    0px 8px 24px rgba(17, 17, 26, 0.05),
    0px 16px 56px rgba(17, 17, 26, 0.05),
    0px 4px 16px rgba(17, 17, 26, 0.05) inset,
    0px 8px 24px rgba(17, 17, 26, 0.05) inset,
    0px 16px 56px rgba(17, 17, 26, 0.05) inset
  `,
});

const fallbackStyles = css({
	bg: "rgba(255, 255, 255, 0.1)",
	backdropFilter: "blur(12px) saturate(1.8) brightness(1.2)",
	border: "1px solid rgba(255, 255, 255, 0.2)",
	boxShadow: `
    inset 0 1px 0 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 0 rgba(255, 255, 255, 0.1)
  `,
});
