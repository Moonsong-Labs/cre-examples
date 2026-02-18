import { defineRecipe } from "@pandacss/dev";

export const section = defineRecipe({
	className: "section",
	base: {
		p: "4",
		borderRadius: "lg",
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
					bg: "gray.surface.bg.hover",
					borderColor: "gray.surface.border.hover",
				},
			},
		},
	},
});
