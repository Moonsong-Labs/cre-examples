import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
	layout("routes/layout.tsx", [
		index("routes/home.tsx"),
		route("examples/cross-chain-relayer", "routes/examples/cross-chain-relayer.tsx"),
	]),
] satisfies RouteConfig;
