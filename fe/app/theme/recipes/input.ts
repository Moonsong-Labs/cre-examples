import type { RecipeConfig } from "@pandacss/dev";

export const input = {
	className: "input",
	jsx: ["Input", "Field.Input"],
	base: {
		appearance: "none",
		borderRadius: "l2",
		height: "var(--input-height)",
		minHeight: "var(--input-height)",
		minW: "var(--input-height)",
		outline: "0",
		position: "relative",
		textAlign: "start",
		transition: "colors",
		width: "100%",
		_disabled: {
			layerStyle: "disabled",
		},
	},
	defaultVariants: {
		size: "md",
		variant: "surface",
	},
	variants: {
		variant: {
			outline: {
				bg: "linear-gradient(180deg, rgba(255,255,255,0.82), var(--example-surface-strong, rgba(232,239,244,0.94)))",
				borderWidth: "0",
				borderColor: "transparent",
				boxShadow:
					"inset 0 0 0 1px rgba(172,179,183,0.1), inset 0 -1px 0 rgba(172,179,183,0.14), inset 0 1px 0 rgba(255,255,255,0.52)",
				focusVisibleRing: "inside",
				_focusVisible: {
					boxShadow:
						"inset 0 0 0 1px rgba(172,179,183,0.1), inset 0 -2px 0 rgba(110,59,216,0.86), inset 0 1px 0 rgba(255,255,255,0.56)",
				},
				_invalid: {
					focusRingColor: "error",
					borderColor: "error",
				},
			},
			surface: {
				bg: "linear-gradient(180deg, rgba(255,255,255,0.8), var(--example-surface-strong, rgba(232,239,244,0.94)))",
				borderWidth: "0",
				borderColor: "transparent",
				boxShadow:
					"inset 0 -1px 0 rgba(172,179,183,0.14), inset 0 1px 0 rgba(255,255,255,0.56)",
				focusVisibleRing: "inside",
				_focusVisible: {
					boxShadow:
						"inset 0 -2px 0 rgba(110,59,216,0.86), inset 0 1px 0 rgba(255,255,255,0.58)",
				},
				_invalid: {
					focusRingColor: "error",
					borderColor: "error",
				},
			},
			subtle: {
				borderWidth: "0",
				borderColor: "transparent",
				bg: "linear-gradient(180deg, rgba(255,255,255,0.72), var(--example-surface, rgba(243,246,250,0.72)))",
				color: "gray.subtle.fg",
				focusVisibleRing: "inside",

				_invalid: {
					focusRingColor: "error",
					borderColor: "error",
				},
			},
			flushed: {
				borderBottomWidth: "1px",
				borderBottomColor: "rgba(172,179,183,0.22)",
				borderRadius: "0",
				color: "fg.default",
				px: "0",
				_invalid: {
					borderColor: "error",
				},
				_focus: {
					borderColor: "rgba(110,59,216,0.86)",
					boxShadowColor: "rgba(110,59,216,0.86)",
					boxShadow: "0 1px 0 0 var(--shadow-color)",
					_invalid: {
						borderColor: "error",
						boxShadowColor: "error",
					},
				},
			},
		},
		size: {
			"2xs": { textStyle: "xs", px: "1.5", "--input-height": "sizes.7" },
			xs: { textStyle: "sm", px: "2", "--input-height": "sizes.8" },
			sm: { textStyle: "sm", px: "2.5", "--input-height": "sizes.9" },
			md: { textStyle: "md", px: "3", "--input-height": "sizes.10" },
			lg: { textStyle: "md", px: "3.5", "--input-height": "sizes.11" },
			xl: { textStyle: "lg", px: "4", "--input-height": "sizes.12" },
			"2xl": { textStyle: "3xl", px: "4.5", "--input-height": "sizes.16" },
		},
	},
} satisfies RecipeConfig;
