import { defineSlotRecipe } from "@pandacss/dev";

export const card = defineSlotRecipe({
	className: "card",
	slots: ["root", "header", "body", "footer", "title", "description"],
	base: {
		root: {
			borderRadius: "28px",
			display: "flex",
			flexDirection: "column",
			overflow: "hidden",
			position: "relative",
			backdropFilter: "blur(18px) saturate(120%)",
		},
		header: {
			display: "flex",
			flexDirection: "column",
			gap: "2",
			p: { base: "5", md: "6" },
		},
		body: {
			display: "flex",
			flex: "1",
			flexDirection: "column",
			pb: { base: "5", md: "6" },
			px: { base: "5", md: "6" },
		},
		footer: {
			display: "flex",
			justifyContent: "flex-end",
			gap: "3",
			pb: { base: "5", md: "6" },
			pt: "2",
			px: { base: "5", md: "6" },
		},
		title: {
			textStyle: "lg",
			fontWeight: "semibold",
			fontFamily: '"Manrope", sans-serif',
			letterSpacing: "-0.02em",
		},
		description: {
			color: "rgba(44,52,55,0.62)",
			textStyle: "sm",
		},
	},
	defaultVariants: {
		variant: "outline",
	},
	variants: {
		variant: {
			elevated: {
				root: {
					bg: "linear-gradient(180deg, rgba(255,255,255,0.9), var(--example-surface, rgba(243,246,250,0.84)))",
					boxShadow:
						"0 30px 72px -42px rgba(44,52,55,0.16), inset 0 1px 0 rgba(255,255,255,0.78)",
				},
			},
			outline: {
				root: {
					bg: "linear-gradient(180deg, rgba(255,255,255,0.86), var(--example-surface, rgba(243,246,250,0.8)))",
					boxShadow:
						"0 24px 56px -44px rgba(44,52,55,0.14), inset 0 1px 0 rgba(255,255,255,0.72)",
				},
			},
			subtle: {
				root: {
					bg: "linear-gradient(180deg, var(--example-surface-strong, rgba(232,239,244,0.94)), rgba(255,255,255,0.72))",
					boxShadow:
						"inset 0 1px 0 rgba(255,255,255,0.56), 0 14px 34px -30px rgba(44,52,55,0.08)",
				},
			},
		},
		hoverable: {
			true: {
				root: {
					transition:
						"transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease",
					cursor: "default",
					_hover: {
						transform: "translateY(-2px)",
						bg: "linear-gradient(180deg, rgba(255,255,255,0.92), var(--example-surface, rgba(247,249,252,0.84)))",
						boxShadow:
							"0 28px 68px -42px rgba(44,52,55,0.16), inset 0 1px 0 rgba(255,255,255,0.78)",
					},
				},
			},
		},
	},
});
