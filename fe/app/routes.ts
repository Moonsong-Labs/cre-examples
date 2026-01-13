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
		route("examples/compliant-token", "routes/examples/compliant-token.tsx"),
		route("examples/risk-portfolio", "routes/examples/risk-portfolio.tsx"),
		route("examples/token-airdrop", "routes/examples/token-airdrop.tsx"),
	]),
	route("resources/whitelist", "routes/resources/whitelist.ts"),
	route("api/allowlist", "routes/api.allowlist.ts"),
	route("api/sync", "routes/api.sync.ts"),
	route("api/relay/:burnTxHash", "routes/api.relay.$burnTxHash.ts"),
	route("api/airdrop/:address", "routes/api.airdrop.$address.ts"),
	route("api/airdrop/sync", "routes/api.airdrop.sync.ts"),
] satisfies RouteConfig;
