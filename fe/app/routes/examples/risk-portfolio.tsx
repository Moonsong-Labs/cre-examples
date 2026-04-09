import katex from "katex";
import {
	Calculator,
	FileCode,
	Info,
	RefreshCw,
	Scale,
	Shield,
	TriangleAlert,
	Workflow,
	Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { css } from "styled-system/css";
import { section } from "styled-system/recipes";
import { sepolia } from "viem/chains";
import { useReadContract } from "wagmi";
import { ExamplePage } from "~/components/example-shell";
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
import { VideoModal } from "~/components/video-modal";
import {
	RISK_METRICS_ORACLE_ADDRESS,
	riskMetricsOracleAbi,
} from "~/config/contracts";
import {
	ASSETS,
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
		{ title: "Auto Portfolio Management" },
		{
			name: "description",
			content:
				"Read oracle risk metrics and compare portfolio weights for three risk profiles.",
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
		<ExamplePage
			title="Automated Portfolio Management"
			description="Read the latest volatility and correlation metrics, build a covariance matrix, and compare conservative, balanced, and aggressive weights for BTC, ETH, LINK, sDAI, and UNI. If the oracle is unavailable, the demo falls back to mock data."
			accent={{
				glow: "rgba(110, 59, 216, 0.16)",
				wash: "rgba(165, 243, 252, 0.22)",
				edge: "rgba(165, 243, 252, 0.26)",
			}}
		>
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
				<Card.Root variant="outline" id="portfolio-allocations">
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
							<PortfolioCard
								title="Conservative"
								weights={portfolios.low}
								icon={Shield}
								rule="Inverse Volatility"
								description="Minimizes drawdown by heavily weighting low-volatility assets and seeking uncorrelated diversifiers."
								colorPalette="teal"
							/>
							<PortfolioCard
								title="Balanced"
								weights={portfolios.balanced}
								icon={Scale}
								rule="Risk Parity"
								description="Balances growth potential with stability. Allocates to volatility while maintaining a hedging baseline."
								colorPalette="blue"
							/>
							<PortfolioCard
								title="Aggressive"
								weights={portfolios.high}
								icon={Zap}
								rule="Momentum / Beta"
								description="Maximizes exposure to high-volatility assets, assuming they offer the highest upside potential."
								colorPalette="amber"
							/>
						</div>
					</Card.Body>
				</Card.Root>
			)}

			{/* Risk Metrics Card */}
			{dataStatus !== "loading" && (
				<Card.Root variant="outline" id="risk-metrics">
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
								<div className={section()}>
									<VolatilityBarChart volBps={normalized.volBps} />
								</div>
								<div className={section()}>
									<RiskContributionChart cov={cov} portfolios={portfolios} />
								</div>
							</div>
							<div className={section()}>
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

			<Card.Root variant="outline" className={css({ order: -1 })}>
				<Card.Header>
					<div
						className={css({
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
						})}
					>
						<Card.Title>How It Works</Card.Title>
						<VideoModal
							youtubeId="3kHNicJe7ts"
							title="Risk Portfolio Walkthrough"
						/>
					</div>
					<Card.Description>
						Overcoming on-chain compute limits with the Chainlink Runtime
						Environment (CRE)
					</Card.Description>
				</Card.Header>
				<Card.Body
					className={css({
						display: "grid",
						gridTemplateColumns: {
							base: "1fr",
							md: "1fr 1fr",
							lg: "1fr 1fr 1fr",
						},
						gap: "4",
					})}
				>
					<div className={section({ hoverable: true })}>
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

					<div className={section({ hoverable: true })}>
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
							Going beyond simply fetching a value, we can do data manipulation
							in the CRE using typical typescript libraries e.g. Decimal.js. We
							use this feature to execute statistical analysis off-chain,
							producing a verifiable result that is cryptographically signed and
							delivered on-chain.
						</Text>
					</div>

					<div className={section({ hoverable: true })}>
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

					<div
						className={css({
							gridColumn: "1 / -1",
							mt: "2",
							pt: "4",
							borderTop: "1px solid",
							borderColor: "border",
							display: "flex",
							flexDirection: "column",
							gap: "4",
						})}
					>
						<div
							className={css({
								display: "flex",
								alignItems: "center",
								gap: "2",
								color: "fg.default",
							})}
						>
							<Calculator className={css({ width: "4", height: "4" })} />
							<Text className={css({ fontWeight: "semibold", fontSize: "sm" })}>
								Mathematical Model
							</Text>
						</div>

						<div
							className={css({
								display: "grid",
								gridTemplateColumns: { base: "1fr 1fr", lg: "repeat(4, 1fr)" },
								gap: "4",
							})}
						>
							<MathBox
								title="Log Returns"
								formula="r_t = \ln\left(\frac{P_t}{P_{t-1}}\right)"
								description="Enables time-additive performance measurement for risk analysis"
							/>
							<MathBox
								title="Covariance"
								formula="\Sigma_{ij} = \text{Cov}(r_i, r_j)"
								description="Quantifies diversification potential between assets"
							/>
							<MathBox
								title="Annualization"
								formula="\Sigma_{\text{ann}} = \Sigma \times 365"
								description="Aligns daily metrics with annual risk budgets"
							/>
							<MathBox
								title="Correlation"
								formula="\rho_{ij} = \frac{\Sigma_{ij}}{\sigma_i \sigma_j}"
								description="Identifies hedging opportunities and concentration risk"
							/>
						</div>
					</div>
				</Card.Body>
			</Card.Root>

			<Toaster />
		</ExamplePage>
	);
}

function MathBox({
	title,
	formula,
	description,
}: {
	title: string;
	formula: string;
	description: string;
}) {
	const html = katex.renderToString(formula, {
		throwOnError: false,
		displayMode: false,
	});

	return (
		<div
			className={css({
				display: "flex",
				flexDirection: "column",
				gap: "3",
				p: "4",
				borderRadius: "md",
				bg: "bg.muted",
				border: "1px solid",
				borderColor: "border.subtle",
			})}
		>
			<Text
				className={css({
					fontSize: "xs",
					fontWeight: "medium",
					color: "fg.muted",
					textTransform: "uppercase",
					letterSpacing: "wide",
				})}
			>
				{title}
			</Text>
			<div
				className={css({
					fontSize: "lg",
					color: "fg.default",
					overflow: "hidden",
					display: "flex",
					alignItems: "center",
					minHeight: "10",
				})}
				dangerouslySetInnerHTML={{ __html: html }}
			/>
			<Text className={css({ fontSize: "xs", color: "fg.muted" })}>
				{description}
			</Text>
		</div>
	);
}

function PortfolioCard({
	title,
	weights,
	icon: Icon,
	rule,
	description,
	colorPalette,
}: {
	title: string;
	weights: number[];
	icon: React.ElementType;
	rule: string;
	description: string;
	colorPalette: "teal" | "blue" | "amber";
}) {
	return (
		<div
			className={css({
				display: "flex",
				flexDirection: "column",
				border: "1px solid",
				borderColor: "border",
				borderRadius: "lg",
				overflow: "hidden",
			})}
		>
			<div
				className={css({
					p: "6",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					borderBottom: "1px solid",
					borderColor: "border",
					bg: "bg.default",
				})}
			>
				<PortfolioPieChart title={title} weights={weights} />
			</div>
			<div
				className={css({
					p: "4",
					bg: "gray.subtle.bg",
					flex: "1",
					display: "flex",
					flexDirection: "column",
					gap: "3",
				})}
			>
				<div
					className={css({ display: "flex", alignItems: "center", gap: "2" })}
				>
					<Icon
						className={css({
							width: "4",
							height: "4",
							color: `${colorPalette}.fg`,
						})}
					/>
					<span
						className={css({
							fontSize: "xs",
							fontWeight: "medium",
							color: `${colorPalette}.fg`,
							textTransform: "uppercase",
							letterSpacing: "wider",
						})}
					>
						{rule}
					</span>
				</div>
				<Text
					className={css({
						fontSize: "xs",
						color: "fg.muted",
						lineHeight: "relaxed",
					})}
				>
					{description}
				</Text>
			</div>
		</div>
	);
}
