import {
	index,
	layout,
	type RouteConfig,
	route,
} from "@react-router/dev/routes";

export default [
	layout("routes/layout.tsx", [
		index("routes/home.tsx"),
		route(
			"examples/cross-chain-relayer",
			"routes/examples/cross-chain-relayer.tsx",
		),
		route(
			"examples/compliant-token",
			"routes/examples/compliant-token.tsx",
		),
		route(
			"examples/risk-portfolio",
			"routes/examples/risk-portfolio.tsx",
		),
	]),
	route("resources/whitelist", "routes/resources/whitelist.ts"),
] satisfies RouteConfig;
