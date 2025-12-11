import { defineConfig } from "@pandacss/dev";
import { teal } from "@/theme/colors/teal";
import { animationStyles } from "./src/theme/animation-styles";
import { crimson } from "./src/theme/colors/crimson";
import { green } from "./src/theme/colors/green";
import { red } from "./src/theme/colors/red";
import { sage } from "./src/theme/colors/sage";
import { conditions } from "./src/theme/conditions";
import { globalCss } from "./src/theme/global-css";
import { keyframes } from "./src/theme/keyframes";
import { layerStyles } from "./src/theme/layer-styles";
import { recipes, slotRecipes } from "./src/theme/recipes";
import { textStyles } from "./src/theme/text-styles";
import { colors } from "./src/theme/tokens/colors";
import { durations } from "./src/theme/tokens/durations";
import { shadows } from "./src/theme/tokens/shadows";
import { zIndex } from "./src/theme/tokens/z-index";

export default defineConfig({
	// Whether to use css reset
	preflight: true,

	// Where to look for your css declarations
	include: ["./src/**/*.{js,jsx,ts,tsx}", "./pages/**/*.{js,jsx,ts,tsx}"],

	// Files to exclude
	exclude: [],

	// Useful for theme customization
	theme: {
		extend: {
			animationStyles: animationStyles,
			recipes: recipes,
			slotRecipes: slotRecipes,
			keyframes: keyframes,
			layerStyles: layerStyles,
			textStyles: textStyles,

			tokens: {
				colors: colors,
				durations: durations,
				zIndex: zIndex,
			},

			semanticTokens: {
				colors: {
					fg: {
						default: {
							value: {
								_light: "{colors.gray.12}",
								_dark: "{colors.gray.12}",
							},
						},

						muted: {
							value: {
								_light: "{colors.gray.11}",
								_dark: "{colors.gray.11}",
							},
						},

						subtle: {
							value: {
								_light: "{colors.gray.10}",
								_dark: "{colors.gray.10}",
							},
						},
					},

					border: {
						value: {
							_light: "{colors.gray.4}",
							_dark: "{colors.gray.4}",
						},
					},

					error: {
						value: {
							_light: "{colors.red.9}",
							_dark: "{colors.red.9}",
						},
					},

					crimson: crimson,
					gray: sage,
					red: red,
					green: green,
					teal: teal,
				},

				shadows: shadows,

				radii: {
					l1: {
						value: "{radii.xs}",
					},

					l2: {
						value: "{radii.sm}",
					},

					l3: {
						value: "{radii.md}",
					},
				},
			},
		},
	},

	// The output directory for your css system
	outdir: "styled-system",

	// Enable JSX support for styled components
	jsxFramework: "react",

	globalCss: globalCss,
	conditions: conditions,
	plugins: [
		{
			name: "Remove Panda Preset Colors",
			hooks: {
				"preset:resolved": ({ utils, preset, name }) =>
					name === "@pandacss/preset-panda"
						? utils.omit(preset, [
								"theme.tokens.colors",
								"theme.semanticTokens.colors",
							])
						: preset,
			},
		},
	],
});