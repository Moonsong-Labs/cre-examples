import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"styled-system": path.resolve(__dirname, "./styled-system"),
		},
	},

	plugins: [react()],
});
