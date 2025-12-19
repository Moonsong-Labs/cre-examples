import { defineSlotRecipe } from "@pandacss/dev";

export const dialog = defineSlotRecipe({
	className: "dialog",
	slots: [
		"root",
		"backdrop",
		"closeTrigger",
		"positioner",
		"content",
		"description",
		"title",
		"trigger",
	],
	base: {
		root: {},
		backdrop: {
			backdropFilter: "blur(4px)",
			background: {
				base: "white.a11",
				_dark: "black.a9",
			},
			height: "100vh",
			left: "0",
			position: "fixed",
			top: "0",
			width: "100vw",
			zIndex: "overlay",
			_open: {
				animation: "backdrop-in",
			},
			_closed: {
				animation: "backdrop-out",
			},
		},
		positioner: {
			alignItems: "center",
			display: "flex",
			justifyContent: "center",
			left: "0",
			pointerEvents: "none",
			position: "fixed",
			top: "0",
			width: "100vw",
			height: "100vh",
			zIndex: "modal",
		},
		content: {
			background: "bg.default",
			borderRadius: "l3",
			boxShadow: "lg",
			minW: "sm",
			pointerEvents: "auto",
			position: "relative",
			_open: {
				animation: "dialog-in",
			},
			_closed: {
				animation: "dialog-out",
			},
		},
		title: {
			fontWeight: "semibold",
			textStyle: "lg",
		},
		description: {
			color: "fg.muted",
			textStyle: "sm",
		},
	},
});
