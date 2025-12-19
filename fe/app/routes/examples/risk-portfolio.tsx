import {
	FileCode,
	Info,
	PieChart,
	RefreshCw,
	TriangleAlert,
	Workflow,
} from "lucide-react";
import { useMemo, useState } from "react";
import { css } from "styled-system/css";
import { sepolia } from "viem/chains";
import { useReadContract } from "wagmi";
import {
	CorrelationHeatmap,
	DataStatusBadge,
	PortfolioPieChart,
	PriceSimulation,
	RiskContributionChart,
	VolatilityBarChart,
} from "~/components/risk-portfolio";
import {
	Alert,
	Badge,
	Button,
	Card,
	Skeleton,
	Text,
	Toaster,
	toaster,
} from "~/components/ui";
import {
	RISK_METRICS_ORACLE_ADDRESS,
	riskMetricsOracleAbi,
} from "~/config/contracts";
import {
	buildCovarianceMatrix,
	computeAllPortfolios,
	type DataStatus,
	MOCK_METRICS,
	normalizeMetrics,
	STALE_THRESHOLD_SECONDS,
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
	const [isRefetching, setIsRefetching] = useState(false);

	const {
		data: metricsData,
		refetch,
		isError,
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

	const useMockData = !isContractDeployed || isError || !metricsData;

	const handleRefresh = async () => {
		setIsRefetching(true);
		toaster.promise(
			refetch().finally(() => setIsRefetching(false)),
			{
				loading: { title: "Refreshing metrics..." },
				success: { title: "Metrics updated", duration: 2000 },
				error: { title: "Failed to fetch metrics", duration: 3000 },
			},
		);
	};

	const metrics = useMemo(() => {
		if (useMockData) {
			return {
				updatedAt: MOCK_METRICS.updatedAt,
				volBps: MOCK_METRICS.volBps,
				corrBps: MOCK_METRICS.corrBps,
			};
		}

		const data = metricsData as {
			updatedAt: bigint;
			vols: readonly number[];
			corrs: readonly number[];
		};

		return {
			updatedAt: data.updatedAt,
			volBps: data.vols.map((v) => BigInt(v)),
			corrBps: data.corrs.map((c) => BigInt(c)),
		};
	}, [metricsData, useMockData]);

	const dataStatus: DataStatus = useMemo(() => {
		if (!metricsData && isContractDeployed && !isError) return "loading";

		const now = Math.floor(Date.now() / 1000);
		const age = now - Number(metrics.updatedAt);
		if (age > STALE_THRESHOLD_SECONDS) return "stale";

		return "ready";
	}, [metricsData, metrics, isContractDeployed, isError]);

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
					<Card.Title>Context & Architecture</Card.Title>
					<Card.Description>
						Overcoming on-chain compute limits with the Chainlink Runtime
						Environment (CRE)
					</Card.Description>
				</Card.Header>
				<Card.Body
					className={css({
						display: "grid",
						gridTemplateColumns: { base: "1fr", lg: "1fr 1fr 1fr" },
						gap: "4",
					})}
				>
					{/* Card 1: The Compute Bottleneck */}
					<div
						className={css({
							p: "4",
							borderRadius: "lg",
							border: "1px solid",
							borderColor: "border",
							bg: "gray.subtle.bg",
							display: "flex",
							flexDirection: "column",
							gap: "3",
						})}
					>
						<div
							className={css({
								display: "flex",
								alignItems: "center",
								gap: "2",
							})}
						>
							<TriangleAlert
								className={css({ width: "4", height: "4", color: "amber.fg" })}
							/>
							<Badge variant="surface" colorPalette="amber" size="sm">
								Problem: Gas & Trust
							</Badge>
						</div>
						<Text className={css({ fontSize: "sm", color: "fg.muted" })}>
							Smart contracts are constrained by gas limits. Complex financial
							modeling—like calculating 30-day rolling covariance matrices
							across multiple assets—is prohibitively expensive to execute
							on-chain and lacks cryptographic guarantees if run on a
							centralized backend.
						</Text>
					</div>

					{/* Card 2: Scriptable Oracles */}
					<div
						className={css({
							p: "4",
							borderRadius: "lg",
							border: "1px solid",
							borderColor: "border",
							bg: "gray.subtle.bg",
							display: "flex",
							flexDirection: "column",
							gap: "3",
						})}
					>
						<div
							className={css({
								display: "flex",
								alignItems: "center",
								gap: "2",
							})}
						>
							<FileCode
								className={css({ width: "4", height: "4", color: "teal.fg" })}
							/>
							<Badge variant="surface" colorPalette="teal" size="sm">
								Solution: Scriptable Oracles
							</Badge>
						</div>
						<Text className={css({ fontSize: "sm", color: "fg.muted" })}>
							The CRE enables <strong>Scriptable Oracles</strong>: decentralized
							workflows written in standard TypeScript. This allows us to fetch
							historical data and execute sophisticated statistical analysis
							off-chain, producing a verifiable result that is cryptographically
							signed and delivered on-chain.
						</Text>
					</div>

					{/* Card 3: Architecture Flow */}
					<div
						className={css({
							p: "4",
							borderRadius: "lg",
							border: "1px solid",
							borderColor: "border",
							bg: "gray.subtle.bg",
							display: "flex",
							flexDirection: "column",
							gap: "3",
						})}
					>
						<div
							className={css({
								display: "flex",
								alignItems: "center",
								gap: "2",
							})}
						>
							<Workflow
								className={css({ width: "4", height: "4", color: "blue.fg" })}
							/>
							<Badge variant="surface" colorPalette="blue" size="sm">
								Implementation
							</Badge>
						</div>
						<ul
							className={css({
								fontSize: "sm",
								color: "fg.muted",
								listStyleType: "disc",
								pl: "4",
								display: "flex",
								flexDirection: "column",
								gap: "1.5",
							})}
						>
							<li>
								<strong>Workflow:</strong> Fetches price history & computes risk
								matrix off-chain.
							</li>
							<li>
								<strong>Oracle Contract:</strong> Receives and stores only the
								verified risk metrics.
							</li>
							<li>
								<strong>Dapp:</strong> Reads the contract to dynamically
								rebalance portfolio weights.
							</li>
						</ul>
					</div>
				</Card.Body>
			</Card.Root>

			{/* Mock Data Alert */}
			{useMockData && (
				<Alert.Root>
					<Alert.Indicator>
						<Info className={css({ width: "4", height: "4" })} />
					</Alert.Indicator>
					<Alert.Content>
						<Alert.Title>Demo Mode</Alert.Title>
						<Alert.Description>
							{isError
								? "Contract call failed. Displaying mock data for demonstration."
								: "Contract not deployed. Displaying mock data for demonstration."}
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
									className={css({
										width: "180px",
										height: "180px",
										borderRadius: "full",
									})}
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
							<PortfolioPieChart
								title="Balanced"
								weights={portfolios.balanced}
							/>
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
									updatedAt={updatedAtDate}
								/>
								{isContractDeployed && (
									<Button
										onClick={handleRefresh}
										variant="subtle"
										size="sm"
										disabled={isRefetching}
									>
										<RefreshCw
											className={css({
												width: "4",
												height: "4",
												...(isRefetching ? { animation: "spin" } : {}),
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
							<div
								className={css({
									display: "flex",
									flexDirection: "column",
									gap: "6",
								})}
							>
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
					<Card.Header>
						<div
							className={css({
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							})}
						>
							<div>
								<Card.Title>Price Simulation</Card.Title>
								<Card.Description>
									Adjust asset prices to see portfolio impact
								</Card.Description>
							</div>
						</div>
					</Card.Header>
					<Card.Body>
						<PriceSimulation portfolios={portfolios} />
					</Card.Body>
				</Card.Root>
			)}

			<Toaster />
		</div>
	);
}
