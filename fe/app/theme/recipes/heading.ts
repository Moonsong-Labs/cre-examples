import { defineRecipe } from "@pandacss/dev";

export const heading = defineRecipe({
	className: "heading",
	base: {
		fontFamily: '"Manrope", sans-serif',
		fontWeight: "semibold",
		letterSpacing: "-0.02em",
	},
});
