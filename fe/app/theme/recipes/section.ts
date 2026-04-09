import { defineRecipe } from "@pandacss/dev";

export const section = defineRecipe({
	className: "section",
	base: {
		p: "4",
		borderRadius: "24px",
		bg: "linear-gradient(180deg, var(--example-surface-strong, rgba(232,239,244,0.92)), rgba(255,255,255,0.68))",
		boxShadow:
			"inset 0 1px 0 rgba(255,255,255,0.52), 0 16px 36px -30px rgba(44,52,55,0.08)",
		display: "flex",
		flexDirection: "column",
		gap: "3",
	},
	variants: {
		hoverable: {
			true: {
				transition: "transform 0.2s ease, background-color 0.2s ease",
				cursor: "default",
				_hover: {
					transform: "translateY(-2px)",
					bg: "linear-gradient(180deg, rgba(255,255,255,0.82), var(--example-surface, rgba(243,246,250,0.78)))",
				},
			},
		},
	},
});
