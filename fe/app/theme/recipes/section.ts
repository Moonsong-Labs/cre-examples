import { defineRecipe } from "@pandacss/dev";

export const section = defineRecipe({
	className: "section",
	base: {
		p: "4",
		borderRadius: "lg",
		border: "1px solid",
		borderColor: "border",
		bg: "gray.subtle.bg",
		display: "flex",
		flexDirection: "column",
		gap: "3",
	},
	variants: {
		hoverable: {
			true: {
				transition: "all 0.2s ease",
				cursor: "default",
				_hover: {
					bg: "rgba(255,255,255,0.08)",
					borderColor: "rgba(255,255,255,0.15)",
				},
			},
		},
	},
});
