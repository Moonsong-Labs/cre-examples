import netlifyReactRouter from "@netlify/vite-plugin-react-router";
import pandacss from "@pandacss/dev/postcss";
import { reactRouter } from "@react-router/dev/vite";
import autoprefixer from "autoprefixer";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	css: {
		postcss: {
			plugins: [pandacss, autoprefixer],
		},
	},
	plugins: [reactRouter(), tsconfigPaths(), netlifyReactRouter()],
	ssr: {
		// These packages have ESM/CJS interop issues on Netlify Functions.
		// Force Vite to bundle them instead of externalizing so its CJS/ESM
		// transformation is applied.
		noExternal: [/^@rainbow-me\//, /^@vanilla-extract\//, "gsap"],
	},
});
