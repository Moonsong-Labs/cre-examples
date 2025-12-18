import { Info, PieChart, RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { css } from "styled-system/css";
import { useReadContract } from "wagmi";
import { sepolia } from "viem/chains";
import { Alert, Badge, Button, Card, Skeleton, Text } from "~/components/ui";
import {
	riskMetricsOracleAbi,
	RISK_METRICS_ORACLE_ADDRESS,
} from "~/config/contracts";
import {
	CorrelationHeatmap,
	DataStatusBadge,
	PortfolioPieChart,
	PriceSimulation,
	RiskContributionChart,
	VolatilityBarChart,
} from "~/components/risk-portfolio";
import {
	buildCovarianceMatrix,
	computeAllPortfolios,
	MOCK_METRICS,
	normalizeMetrics,
	STALE_THRESHOLD_SECONDS,
	WINDOW_SIZE,
	type DataStatus,
} from "~/lib/risk-portfolio";
import type { Route } from "./+types/risk-portfolio";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Risk Portfolio - CRE Examples" },
		{
			name: "description",
			content:
				"On-chain volatility and correlation metrics drive portfolio allocations",
		},
	];
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export default function RiskPortfolio() {
	const isContractDeployed = RISK_METRICS_ORACLE_ADDRESS !== ZERO_ADDRESS;

	const {
		data: metricsData,
		refetch,
		isLoading,
	} = useReadContract({
		chainId: sepolia.id,
		address: RISK_METRICS_ORACLE_ADDRESS,
		abi: riskMetricsOracleAbi,
		functionName: "latestMetrics",
		query: {
			enabled: isContractDeployed,
			refetchInterval: 60000,
		},
	});

	const metrics = useMemo(() => {
		if (!isContractDeployed || !metricsData) {
			return {
				updatedAt: MOCK_METRICS.updatedAt,
				count: MOCK_METRICS.count,
				idx: MOCK_METRICS.idx,
				volBps: MOCK_METRICS.volBps,
				corrBps: MOCK_METRICS.corrBps,
			};
		}

		const [updatedAt, count, idx, volBps, corrBps] = metricsData as [
			bigint,
			number,
			number,
			readonly bigint[],
			readonly bigint[],
		];

		return { updatedAt, count, idx, volBps, corrBps };
	}, [metricsData, isContractDeployed]);

	const dataStatus: DataStatus = useMemo(() => {
		if (isLoading && isContractDeployed) return "loading";
		if (metrics.count < WINDOW_SIZE) return "warming-up";

		const now = Math.floor(Date.now() / 1000);
		const age = now - Number(metrics.updatedAt);
		if (age > STALE_THRESHOLD_SECONDS) return "stale";

		return "ready";
	}, [isLoading, metrics, isContractDeployed]);

	const updatedAtDate = useMemo(() => {
		if (!metrics.updatedAt) return null;
		return new Date(Number(metrics.updatedAt) * 1000);
	}, [metrics.updatedAt]);

	const normalized = useMemo(
		() => normalizeMetrics(metrics.volBps, metrics.corrBps),
		[metrics.volBps, metrics.corrBps],
	);

	const cov = useMemo(() => buildCovarianceMatrix(normalized), [normalized]);

	const portfolios = useMemo(() => computeAllPortfolios(cov), [cov]);

	return (
		<div
			className={css({
				maxWidth: "5xl",
				mx: "auto",
				py: { base: "6", md: "10" },
				px: { base: "4", md: "6" },
				display: "flex",
				flexDirection: "column",
				gap: "8",
			})}
		>
			{/* Header */}
			<div
				className={css({
					display: "flex",
					flexDirection: { base: "column", md: "row" },
					justifyContent: "space-between",
					alignItems: { base: "flex-start", md: "flex-end" },
					gap: "4",
				})}
			>
				<div>
					<Text
						as="h1"
						className={css({
							fontSize: "3xl",
							fontWeight: "bold",
							mb: "2",
							color: "fg.default",
						})}
					>
						Risk Portfolio
					</Text>
					<Text className={css({ color: "fg.muted", fontSize: "lg" })}>
						Dynamic portfolio allocations driven by on-chain risk metrics
					</Text>
				</div>
				<div
					className={css({
						display: "flex",
						alignItems: "center",
						gap: "2",
						flexWrap: "wrap",
					})}
				>
					<Badge variant="surface" colorPalette="teal" size="md">
						<PieChart className={css({ width: "3.5", height: "3.5" })} />
						Risk Budgeting
					</Badge>
					<Badge variant="subtle" colorPalette="gray" size="md">
						5 Assets
					</Badge>
				</div>
			</div>

			{/* Context Card */}
			<Card.Root variant="outline">
				<Card.Header>
					<Card.Title>Context</Card.Title>
				</Card.Header>
				<Card.Body
					className={css({
						display: "grid",
						gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
						gap: "4",
					})}
				>
					<div
						className={css({
							p: "4",
							borderRadius: "lg",
							border: "1px solid",
							borderColor: "border",
							bg: "gray.subtle.bg",
							display: "flex",
							flexDirection: "column",
							gap: "2",
						})}
					>
						<Badge variant="outline" colorPalette="amber" size="sm">
							Problem
						</Badge>
						<Text className={css({ fontSize: "sm", color: "fg.muted" })}>
							Traditional portfolio allocation is static and doesn't adapt to
							changing market conditions. Volatility and correlations shift over
							time, making fixed allocations suboptimal.
						</Text>
					</div>
					<div
						className={css({
							p: "4",
							borderRadius: "lg",
							border: "1px solid",
							borderColor: "border",
							bg: "gray.subtle.bg",
							display: "flex",
							flexDirection: "column",
							gap: "2",
						})}
					>
						<Badge variant="outline" colorPalette="teal" size="sm">
							Remedy
						</Badge>
						<Text className={css({ fontSize: "sm", color: "fg.muted" })}>
							CRE workflows compute 30-day rolling volatilities and correlations
							from on-chain price feeds, enabling dynamic risk-budgeted portfolio
							allocations that adapt to market conditions.
						</Text>
					</div>
				</Card.Body>
			</Card.Root>

			{/* Mock Data Alert */}
			{!isContractDeployed && (
				<Alert.Root>
					<Alert.Indicator>
						<Info className={css({ width: "4", height: "4" })} />
					</Alert.Indicator>
					<Alert.Content>
						<Alert.Title>Demo Mode</Alert.Title>
						<Alert.Description>
							Contract not deployed. Displaying mock data for demonstration.
						</Alert.Description>
					</Alert.Content>
				</Alert.Root>
			)}

			{/* Portfolio Pie Charts */}
			{dataStatus === "loading" ? (
				<div
					className={css({
						display: "grid",
						gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
						gap: "6",
					})}
				>
					{[1, 2, 3].map((i) => (
						<Card.Root key={i} variant="outline">
							<Card.Body
								className={css({
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: "4",
									py: "6",
								})}
							>
								<Skeleton
									className={css({ width: "180px", height: "180px", borderRadius: "full" })}
								/>
								<Skeleton className={css({ width: "120px", height: "4" })} />
							</Card.Body>
						</Card.Root>
					))}
				</div>
			) : (
				<Card.Root variant="outline">
					<Card.Header>
						<Card.Title>Portfolio Allocations</Card.Title>
						<Card.Description>
							Risk-budgeted weights across BTC, ETH, LINK, sDAI, SHIB
						</Card.Description>
					</Card.Header>
					<Card.Body>
						<div
							className={css({
								display: "grid",
								gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
								gap: "6",
							})}
						>
							<PortfolioPieChart title="Low Risk" weights={portfolios.low} />
							<PortfolioPieChart title="Balanced" weights={portfolios.balanced} />
							<PortfolioPieChart title="High Risk" weights={portfolios.high} />
						</div>
					</Card.Body>
				</Card.Root>
			)}

			{/* Risk Metrics Card */}
			{dataStatus !== "loading" && (
				<Card.Root variant="outline">
					<Card.Header>
						<div
							className={css({
								display: "flex",
								justifyContent: "space-between",
								alignItems: { base: "flex-start", md: "center" },
								flexDirection: { base: "column", md: "row" },
								gap: "3",
							})}
						>
							<div>
								<Card.Title>Risk Metrics</Card.Title>
								<Card.Description>
									30-day rolling volatility and correlation analysis
								</Card.Description>
							</div>
							<div
								className={css({
									display: "flex",
									alignItems: "center",
									gap: "2",
								})}
							>
								<DataStatusBadge
									status={dataStatus}
									count={metrics.count}
									updatedAt={updatedAtDate}
								/>
								{isContractDeployed && (
									<Button
										onClick={() => refetch()}
										variant="subtle"
										size="sm"
										disabled={isLoading}
									>
										<RefreshCw
											className={css({
												width: "4",
												height: "4",
												...(isLoading ? { animation: "spin" } : {}),
											})}
										/>
										Refresh
									</Button>
								)}
							</div>
						</div>
					</Card.Header>
					<Card.Body>
						<div
							className={css({
								display: "grid",
								gridTemplateColumns: { base: "1fr", lg: "1fr 1fr" },
								gap: "6",
							})}
						>
							<div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
								<div
									className={css({
										p: "4",
										borderRadius: "lg",
										bg: "gray.subtle.bg",
										border: "1px solid",
										borderColor: "border",
									})}
								>
									<VolatilityBarChart volBps={normalized.volBps} />
								</div>
								<div
									className={css({
										p: "4",
										borderRadius: "lg",
										bg: "gray.subtle.bg",
										border: "1px solid",
										borderColor: "border",
									})}
								>
									<RiskContributionChart cov={cov} portfolios={portfolios} />
								</div>
							</div>
							<div
								className={css({
									p: "4",
									borderRadius: "lg",
									bg: "gray.subtle.bg",
									border: "1px solid",
									borderColor: "border",
								})}
							>
								<CorrelationHeatmap corrBps={normalized.corrBps} />
							</div>
						</div>
					</Card.Body>
				</Card.Root>
			)}

			{/* Price Simulation */}
			{dataStatus !== "loading" && (
				<Card.Root variant="outline">
					<Card.Body>
						<PriceSimulation portfolios={portfolios} />
					</Card.Body>
				</Card.Root>
			)}
		</div>
	);
}
