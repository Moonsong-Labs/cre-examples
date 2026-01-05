import {
	Activity,
	CheckCircle,
	Coins,
	ExternalLink,
	FileCode,
	Gift,
	Globe,
	Loader2,
	RefreshCw,
	Search,
	TriangleAlert,
	Workflow,
	XCircle,
	Zap,
} from "lucide-react";
import { VideoModal } from "~/components/video-modal";
import { useCallback, useEffect, useMemo, useState } from "react";
import { css, cx } from "styled-system/css";
import { section } from "styled-system/recipes";
import { formatUnits, isAddress } from "viem";
import { sepolia } from "viem/chains";
import { useAccount, useChainId, useReadContract, useSwitchChain } from "wagmi";
import { AddToWalletButton } from "~/components/add-to-wallet-button";
import { Badge, Button, Card, Field, Input, Text } from "~/components/ui";
import { AIRDROP_TOKEN_ADDRESS, airdropTokenAbi } from "~/config/contracts";
import type { Route } from "./+types/token-airdrop";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Token Airdrop - CRE Examples" },
		{
			name: "description",
			content: "Distribute tokens via merkle proof airdrop using CRE",
		},
	];
}

const ETHERSCAN_BASE = "https://sepolia.etherscan.io";
const SPREADSHEET_URL =
	"https://docs.google.com/spreadsheets/d/1rSiwh0ATppPnRqh9-bh-eKA2h37Zy8qd1IWXAXm8kvQ/edit";

function formatAddress(address: string): string {
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatBalance(balance: bigint | undefined): string {
	if (balance === undefined) return "—";
	return Number(formatUnits(balance, 0)).toFixed(0);
}

interface AirdropStatus {
	address: string;
	allocatedAmount: string;
	provedAmount: string;
	status: "available" | "pending" | "claimed";
}

export default function TokenAirdrop() {
	const { isConnected, address } = useAccount();
	const chainId = useChainId();
	const { switchChainAsync } = useSwitchChain();

	// Address query state
	const [queryAddress, setQueryAddress] = useState("");
	const effectiveAddress = queryAddress || address;

	// API status state
	const [airdropStatus, setAirdropStatus] = useState<AirdropStatus | null>(
		null,
	);
	const [statusLoading, setStatusLoading] = useState(false);
	const [statusError, setStatusError] = useState<string | null>(null);

	// Operation states
	const [isSyncing, setIsSyncing] = useState(false);
	const [syncError, setSyncError] = useState<string | null>(null);
	const [syncSuccess, setSyncSuccess] = useState(false);
	const [isClaiming, setIsClaiming] = useState(false);
	const [claimError, setClaimError] = useState<string | null>(null);
	const [claimSuccess, setClaimSuccess] = useState(false);

	const isSepoliaChain = chainId === sepolia.id;

	// Read token name
	const { data: tokenName } = useReadContract({
		chainId: sepolia.id,
		address: AIRDROP_TOKEN_ADDRESS,
		abi: airdropTokenAbi,
		functionName: "name",
		query: {
			enabled: isSepoliaChain,
		},
	});

	// Read token symbol
	const { data: tokenSymbol } = useReadContract({
		chainId: sepolia.id,
		address: AIRDROP_TOKEN_ADDRESS,
		abi: airdropTokenAbi,
		functionName: "symbol",
		query: {
			enabled: isSepoliaChain,
		},
	});

	// Read total claimed for queried address
	const { data: totalClaimed, refetch: refetchTotalClaimed } = useReadContract({
		chainId: sepolia.id,
		address: AIRDROP_TOKEN_ADDRESS,
		abi: airdropTokenAbi,
		functionName: "totalClaimed",
		args:
			effectiveAddress && isAddress(effectiveAddress)
				? [effectiveAddress as `0x${string}`]
				: undefined,
		query: {
			enabled:
				isSepoliaChain && !!effectiveAddress && isAddress(effectiveAddress),
		},
	});

	// Read user balance
	const { data: userBalance } = useReadContract({
		chainId: sepolia.id,
		address: AIRDROP_TOKEN_ADDRESS,
		abi: airdropTokenAbi,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
		query: {
			enabled: isSepoliaChain && !!address,
		},
	});

	// Fetch airdrop status from API
	const fetchAirdropStatus = useCallback(async (addr: string) => {
		if (!addr || !isAddress(addr)) return;

		setStatusLoading(true);
		setStatusError(null);

		try {
			const serverUrl =
				import.meta.env.VITE_CRE_HELPER_SERVER_URL || "http://localhost:3000";
			const response = await fetch(`${serverUrl}/04-airdrop/${addr}`);

			if (!response.ok) {
				if (response.status >= 500) {
					throw new Error(
						"Server is temporarily unavailable. Please try again later.",
					);
				}
				if (response.status === 404) {
					// Address not found - show as not allocated
					setAirdropStatus({
						address: addr,
						allocatedAmount: "0",
						provedAmount: "0",
						status: "available",
					});
					return;
				}
				throw new Error(`Request failed (HTTP ${response.status})`);
			}

			const data = await response.json();
			setAirdropStatus(data);
		} catch (error) {
			let message: string;
			if (error instanceof TypeError && error.message.includes("fetch")) {
				message = "Unable to connect to server. Please check your connection.";
			} else {
				message =
					error instanceof Error ? error.message : "Failed to fetch status";
			}
			setStatusError(message);
			// Don't clear airdropStatus on server errors - keep previous data if available
		} finally {
			setStatusLoading(false);
		}
	}, []);

	// Fetch status when effective address changes
	useEffect(() => {
		if (effectiveAddress && isAddress(effectiveAddress)) {
			fetchAirdropStatus(effectiveAddress);
		} else {
			setAirdropStatus(null);
			setStatusError(null);
		}
	}, [effectiveAddress, fetchAirdropStatus]);

	// Poll for status updates when pending
	useEffect(() => {
		if (airdropStatus?.status === "pending") {
			const interval = setInterval(() => {
				if (effectiveAddress) {
					fetchAirdropStatus(effectiveAddress);
					refetchTotalClaimed();
				}
			}, 10000);
			return () => clearInterval(interval);
		}
	}, [
		airdropStatus?.status,
		effectiveAddress,
		fetchAirdropStatus,
		refetchTotalClaimed,
	]);

	// Network switch handler
	const handleSwitchToSepolia = async () => {
		try {
			await switchChainAsync({ chainId: sepolia.id });
		} catch (error) {
			console.error("Failed to switch chain:", error);
		}
	};

	// Sync handler
	const handleSync = async () => {
		try {
			setIsSyncing(true);
			setSyncError(null);
			setSyncSuccess(false);

			const serverUrl =
				import.meta.env.VITE_CRE_HELPER_SERVER_URL || "http://localhost:3000";
			const apiKey = import.meta.env.VITE_CRE_HELPER_API_KEY;

			if (!apiKey) {
				throw new Error("Missing API key (VITE_CRE_HELPER_API_KEY)");
			}

			const response = await fetch(`${serverUrl}/04-airdrop/sync`, {
				method: "POST",
				headers: { "X-API-Key": apiKey },
			});

			if (!response.ok) {
				const errorBody = await response.text().catch(() => "");
				throw new Error(
					`Failed to sync (HTTP ${response.status}): ${errorBody}`,
				);
			}

			setSyncSuccess(true);

			// Refresh data after sync
			if (effectiveAddress) {
				await fetchAirdropStatus(effectiveAddress);
				await refetchTotalClaimed();
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to sync";
			console.error(message, error);
			setSyncError(message);
		} finally {
			setIsSyncing(false);
		}
	};

	// Claim handler
	const handleClaim = async () => {
		if (!effectiveAddress || !isAddress(effectiveAddress)) return;

		try {
			setIsClaiming(true);
			setClaimError(null);
			setClaimSuccess(false);

			const serverUrl =
				import.meta.env.VITE_CRE_HELPER_SERVER_URL || "http://localhost:3000";
			const apiKey = import.meta.env.VITE_CRE_HELPER_API_KEY;

			if (!apiKey) {
				throw new Error("Missing API key (VITE_CRE_HELPER_API_KEY)");
			}

			const response = await fetch(
				`${serverUrl}/04-airdrop/${effectiveAddress}/claim`,
				{
					method: "POST",
					headers: { "X-API-Key": apiKey },
				},
			);

			if (!response.ok) {
				const errorBody = await response.text().catch(() => "");
				throw new Error(
					`Failed to claim (HTTP ${response.status}): ${errorBody}`,
				);
			}

			setClaimSuccess(true);

			// Refresh status
			await fetchAirdropStatus(effectiveAddress);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to claim";
			console.error(message, error);
			setClaimError(message);
		} finally {
			setIsClaiming(false);
		}
	};

	// Check if sync is needed (allocated > proved)
	const needsSync = useMemo(() => {
		if (!airdropStatus) return false;
		const allocated = BigInt(airdropStatus.allocatedAmount || "0");
		const proved = BigInt(airdropStatus.provedAmount || "0");
		return allocated > proved;
	}, [airdropStatus]);

	// Calculate claimable amount (from proved amount only)
	const claimableAmount = useMemo(() => {
		if (!airdropStatus) return 0n;
		const proved = BigInt(airdropStatus.provedAmount || "0");
		const claimed = (totalClaimed as bigint) ?? 0n;
		const remaining = proved - claimed;
		return remaining > 0n ? remaining : 0n;
	}, [airdropStatus, totalClaimed]);

	// Can claim check
	const canClaim = useMemo(() => {
		if (!airdropStatus) return false;
		if (airdropStatus.status !== "available") return false;
		return claimableAmount > 0n;
	}, [airdropStatus, claimableAmount]);

	// Validation
	const isValidQueryAddress = useMemo(() => {
		if (!queryAddress) return true;
		return isAddress(queryAddress);
	}, [queryAddress]);

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
						Token Airdrop
					</Text>
					<Text className={css({ color: "fg.muted", fontSize: "lg" })}>
						Distribute tokens via merkle proof airdrop using CRE
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
					<Badge variant="surface" colorPalette="blue" size="md">
						<Globe className={css({ width: "3.5", height: "3.5" })} />
						HTTP Trigger
					</Badge>
					<Badge variant="subtle" colorPalette="gray" size="md">
						<Search className={css({ width: "3.5", height: "3.5" })} />
						HTTP Client
					</Badge>
					<Badge variant="outline" colorPalette="teal" size="md">
						<Zap className={css({ width: "3.5", height: "3.5" })} />
						EVM Write
					</Badge>
				</div>
			</div>

			{/* How It Works Card */}
			<Card.Root variant="outline">
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
							youtubeId="aqz-KE-bpKQ"
							title="Token Airdrop Walkthrough"
						/>
					</div>
					<Card.Description>
						Scalable token distribution with gasless claims powered by the
						Chainlink Runtime Environment (CRE)
					</Card.Description>
				</Card.Header>
				<Card.Body
					className={css({
						display: "grid",
						gridTemplateColumns: { base: "1fr", lg: "1fr 1fr 1fr" },
						gap: "4",
					})}
				>
					{/* Card 1: The Problem */}
					<Card.Root variant="subtle" hoverable>
						<Card.Body className={css({ p: "4", gap: "3" })}>
							<div
								className={css({
									display: "flex",
									alignItems: "center",
									gap: "2",
								})}
							>
								<TriangleAlert
									className={css({
										width: "4",
										height: "4",
										color: "amber.fg",
									})}
								/>
								<Badge variant="surface" colorPalette="amber" size="sm">
									Problem: Complex Distribution
								</Badge>
							</div>
							<Text className={css({ fontSize: "sm", color: "fg.muted" })}>
								Distributing tokens to many addresses requires building merkle
								trees, managing proofs, and users need ETH to pay gas for
								claiming—creating friction and complexity for both operators and
								recipients.
							</Text>
						</Card.Body>
					</Card.Root>

					{/* Card 2: The Solution */}
					<Card.Root variant="subtle" hoverable>
						<Card.Body className={css({ p: "4", gap: "3" })}>
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
									Solution: CRE Automation
								</Badge>
							</div>
							<Text className={css({ fontSize: "sm", color: "fg.muted" })}>
								Manage allocations from a simple Google Spreadsheet. CRE handles
								merkle tree generation, on-chain publishing, and sponsors claim
								transactions—users receive tokens without needing ETH.
							</Text>
						</Card.Body>
					</Card.Root>

					{/* Card 3: Implementation */}
					<Card.Root variant="subtle" hoverable>
						<Card.Body className={css({ p: "4", gap: "3" })}>
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
									<strong>Allocate:</strong> Update addresses and amounts in a
									Google Spreadsheet.
								</li>
								<li>
									<strong>Sync:</strong> Prover workflow builds merkle tree and
									publishes root on-chain.
								</li>
								<li>
									<strong>Claim:</strong> Claimer workflow executes gasless
									claims with proof verification.
								</li>
							</ul>
						</Card.Body>
					</Card.Root>

					{/* Technical Breakdown */}
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
							<Activity className={css({ width: "4", height: "4" })} />
							<Text className={css({ fontWeight: "semibold", fontSize: "sm" })}>
								Technical Breakdown
							</Text>
						</div>

						<div
							className={css({
								display: "grid",
								gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
								gap: "4",
							})}
						>
							<StepCard
								title="Allocation Data"
								imageSrc="/written-code-80.png"
								imageSrcSet="/written-code-160.png 2x"
								description="Community managers define token allocations in a Google Spreadsheet"
							/>
							<StepCard
								title="Prover Workflow"
								imageSrc="/workflow-nodes-80.png"
								imageSrcSet="/workflow-nodes-160.png 2x"
								description="Builds merkle tree from allocations, stores proofs, and publishes root on-chain"
							/>
							<StepCard
								title="Claimer Workflow"
								imageSrc="/shield-80.png"
								imageSrcSet="/shield-160.png 2x"
								description="Executes gasless claims by submitting proofs and sponsoring transactions"
							/>
						</div>
					</div>
				</Card.Body>
			</Card.Root>

			{/* Token Info */}
			{isConnected && (
				<div
					className={css({
						display: "flex",
						flexDirection: { base: "column", md: "row" },
						gap: "4",
						alignItems: { base: "stretch", md: "center" },
						justifyContent: "space-between",
						p: "4",
						borderRadius: "xl",
						border: "1px solid",
						borderColor: "border",
						bg: "gray.surface.bg",
					})}
				>
					<div
						className={css({
							display: "flex",
							alignItems: "center",
							gap: "2",
							color: "fg.muted",
							fontSize: "sm",
							flexWrap: "wrap",
						})}
					>
						<Gift
							className={css({
								width: "4",
								height: "4",
								color: "teal.11",
								flexShrink: 0,
							})}
						/>
						<div>
							<Text className={css({ fontWeight: "medium", fontSize: "sm" })}>
								{typeof tokenName === "string" ? tokenName : "Airdrop Token"}
							</Text>
							<a
								href={`${ETHERSCAN_BASE}/address/${AIRDROP_TOKEN_ADDRESS}`}
								target="_blank"
								rel="noopener noreferrer"
								className={css({
									display: "inline-flex",
									alignItems: "center",
									gap: "1",
									color: "teal.11",
									fontSize: "xs",
									_hover: { textDecoration: "underline" },
								})}
							>
								{formatAddress(AIRDROP_TOKEN_ADDRESS)}
								<ExternalLink
									className={css({ width: "2.5", height: "2.5" })}
								/>
							</a>
						</div>
					</div>

					<div
						className={css({
							display: "flex",
							gap: "3",
							flexWrap: "wrap",
							justifyContent: { base: "flex-start", md: "flex-end" },
							alignItems: "center",
						})}
					>
						<AddToWalletButton
							address={AIRDROP_TOKEN_ADDRESS}
							symbol={typeof tokenSymbol === "string" ? tokenSymbol : "TAT"}
							decimals={0}
							size="sm"
							variant="outline"
							label="Add to Wallet"
						/>

						<div
							className={css({
								display: "flex",
								alignItems: "center",
								gap: "2",
								bg: "gray.subtle.bg",
								borderRadius: "md",
								px: "3",
								py: "1.5",
							})}
						>
							<Coins
								className={css({
									width: "3.5",
									height: "3.5",
									color: "blue.11",
								})}
							/>
							<Text className={css({ fontWeight: "medium" })}>
								{formatBalance(userBalance as bigint | undefined)}
							</Text>
							<Text className={css({ color: "fg.subtle", fontSize: "xs" })}>
								Your Balance
							</Text>
						</div>
					</div>
				</div>
			)}

			{!isConnected && (
				<Card.Root variant="outline">
					<Card.Body className={css({ py: "8", textAlign: "center" })}>
						<Text className={css({ color: "fg.muted" })}>
							Connect your wallet to check your airdrop status
						</Text>
					</Card.Body>
				</Card.Root>
			)}

			{isConnected && !isSepoliaChain && (
				<Card.Root variant="outline" className={css({ borderColor: "red.7" })}>
					<Card.Body
						className={css({ display: "flex", gap: "4", alignItems: "center" })}
					>
						<XCircle
							className={css({
								width: "5",
								height: "5",
								color: "red.11",
								flexShrink: 0,
							})}
						/>
						<div className={css({ flex: 1 })}>
							<Text className={css({ fontWeight: "medium", mb: "1" })}>
								Wrong Network
							</Text>
							<Text className={css({ fontSize: "sm", color: "fg.muted" })}>
								Please switch to Sepolia testnet to continue
							</Text>
						</div>
						<Button
							onClick={handleSwitchToSepolia}
							className={css({ flexShrink: 0 })}
						>
							Switch to Sepolia
						</Button>
					</Card.Body>
				</Card.Root>
			)}

			{/* Airdrop Status Section */}
			{isConnected && isSepoliaChain && (
				<Card.Root variant="elevated">
					<Card.Header>
						<div
							className={css({
								display: "flex",
								flexDirection: { base: "column", md: "row" },
								justifyContent: "space-between",
								alignItems: { base: "flex-start", md: "center" },
								gap: "4",
							})}
						>
							<div>
								<Card.Title>
									<div
										className={css({
											display: "flex",
											alignItems: "center",
											gap: "2",
										})}
									>
										<Gift className={css({ width: "5", height: "5" })} />
										Check Airdrop Status
									</div>
								</Card.Title>
								<Card.Description>
									Query any address to check eligibility and claim tokens
								</Card.Description>
							</div>
							<div
								className={css({
									display: "flex",
									alignItems: "center",
									gap: "2",
								})}
							>
								<a
									href={SPREADSHEET_URL}
									target="_blank"
									rel="noopener noreferrer"
									className={css({
										display: "inline-flex",
										alignItems: "center",
										gap: "1.5",
										px: "3",
										py: "2",
										borderRadius: "md",
										border: "1px solid",
										borderColor: "border",
										color: "teal.11",
										fontSize: "sm",
										fontWeight: "medium",
										_hover: { bg: "gray.subtle.bg" },
									})}
								>
									<ExternalLink
										className={css({ width: "3.5", height: "3.5" })}
									/>
									Open Sheet
								</a>
								<Button
									onClick={handleSync}
									disabled={isSyncing || !!statusError}
									variant="outline"
									size="sm"
									className={css({ gap: "1" })}
								>
									{isSyncing ? (
										<>
											<Loader2
												className={css({
													width: "3.5",
													height: "3.5",
													animation: "spin",
												})}
											/>
											Syncing...
										</>
									) : (
										<>
											<RefreshCw
												className={css({ width: "3.5", height: "3.5" })}
											/>
											Sync
										</>
									)}
								</Button>
							</div>
						</div>
					</Card.Header>
					<Card.Body
						className={css({
							display: "flex",
							flexDirection: "column",
							gap: "6",
						})}
					>
						{/* Sync messages */}
						{syncError && (
							<div
								className={css({
									p: "3",
									borderRadius: "md",
									border: "1px solid",
									borderColor: "red.7",
									bg: "red.subtle.bg",
									display: "flex",
									alignItems: "center",
									gap: "2",
								})}
							>
								<XCircle
									className={css({ width: "5", height: "5", color: "red.11" })}
								/>
								<div className={css({ flex: 1 })}>
									<Text
										className={css({
											fontWeight: "medium",
											fontSize: "sm",
											color: "red.12",
										})}
									>
										{syncError.split("\n")[0]}
									</Text>
								</div>
								<Button
									onClick={() => setSyncError(null)}
									size="sm"
									variant="plain"
									className={css({ flexShrink: 0 })}
								>
									Dismiss
								</Button>
							</div>
						)}

						{syncSuccess && (
							<div
								className={css({
									p: "3",
									borderRadius: "md",
									border: "1px solid",
									borderColor: "green.7",
									bg: "green.subtle.bg",
									display: "flex",
									alignItems: "center",
									gap: "2",
								})}
							>
								<CheckCircle
									className={css({
										width: "5",
										height: "5",
										color: "green.11",
									})}
								/>
								<div className={css({ flex: 1 })}>
									<Text
										className={css({
											fontWeight: "medium",
											fontSize: "sm",
											color: "green.12",
										})}
									>
										Sync triggered! Merkle root will be updated shortly.
									</Text>
								</div>
								<Button
									onClick={() => setSyncSuccess(false)}
									size="sm"
									variant="plain"
									className={css({ flexShrink: 0 })}
								>
									Dismiss
								</Button>
							</div>
						)}

						{/* Address input */}
						<div
							className={css({
								display: "flex",
								flexDirection: { base: "column", md: "row" },
								gap: "4",
								alignItems: { base: "stretch", md: "flex-end" },
							})}
						>
							<Field.Root
								className={css({ flex: 1 })}
								invalid={!isValidQueryAddress}
							>
								<Field.Label>Address to Check</Field.Label>
								<Input
									type="text"
									placeholder={address || "0x..."}
									value={queryAddress}
									onChange={(e) => setQueryAddress(e.target.value)}
								/>
								{!isValidQueryAddress && (
									<Text className={css({ fontSize: "sm", color: "red.11" })}>
										Invalid address format
									</Text>
								)}
							</Field.Root>
							<div className={css({ display: "flex", gap: "2" })}>
								{address && (
									<Button
										onClick={() => setQueryAddress("")}
										variant="outline"
										size="sm"
										disabled={!queryAddress}
									>
										Use My Address
									</Button>
								)}
								<Button
									onClick={() => {
										if (effectiveAddress) {
											fetchAirdropStatus(effectiveAddress);
											refetchTotalClaimed();
										}
									}}
									variant="outline"
									size="sm"
									disabled={
										!effectiveAddress || !isValidQueryAddress || statusLoading
									}
								>
									<RefreshCw
										className={css({
											width: "3.5",
											height: "3.5",
											...(statusLoading ? { animation: "spin" } : {}),
										})}
									/>
								</Button>
							</div>
						</div>

						{/* Network Error Display */}
						{statusError && (
							<div
								className={css({
									p: "3",
									borderRadius: "md",
									border: "1px solid",
									borderColor: "red.7",
									bg: "red.subtle.bg",
									display: "flex",
									alignItems: "center",
									gap: "2",
								})}
							>
								<XCircle
									className={css({ width: "5", height: "5", color: "red.11" })}
								/>
								<Text
									className={css({
										fontSize: "sm",
										color: "red.12",
									})}
								>
									{statusError}
								</Text>
							</div>
						)}

						{/* Status Display - Always visible */}
						<div
							className={css({
								display: "grid",
								gridTemplateColumns: { base: "1fr 1fr", md: "repeat(4, 1fr)" },
								gap: "4",
							})}
						>
							{/* Allocated (from spreadsheet) */}
							<div
								className={css({
									p: "4",
									borderRadius: "md",
									border: "1px solid",
									borderColor: needsSync ? "amber.7" : "border",
									bg: needsSync ? "amber.subtle.bg" : "gray.subtle.bg",
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: "2",
								})}
							>
								<Text className={css({ fontSize: "xs", color: "fg.muted" })}>
									Allocated
								</Text>
								<Text
									className={css({
										fontSize: "xl",
										fontWeight: "bold",
										color: needsSync ? "amber.11" : "fg.default",
									})}
								>
									{statusLoading
										? "—"
										: (airdropStatus?.allocatedAmount ?? "0")}
								</Text>
								{needsSync && (
									<Text className={css({ fontSize: "xs", color: "amber.11" })}>
										Sync needed
									</Text>
								)}
							</div>

							{/* Synced (from proofs) */}
							<div
								className={css({
									p: "4",
									borderRadius: "md",
									border: "1px solid",
									borderColor: "border",
									bg: "gray.subtle.bg",
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: "2",
								})}
							>
								<Text className={css({ fontSize: "xs", color: "fg.muted" })}>
									Synced
								</Text>
								<Text className={css({ fontSize: "xl", fontWeight: "bold" })}>
									{statusLoading ? "—" : (airdropStatus?.provedAmount ?? "0")}
								</Text>
							</div>

							{/* Claimed (from contract) */}
							<div
								className={css({
									p: "4",
									borderRadius: "md",
									border: "1px solid",
									borderColor: "border",
									bg: "gray.subtle.bg",
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: "2",
								})}
							>
								<Text className={css({ fontSize: "xs", color: "fg.muted" })}>
									Claimed
								</Text>
								<Text className={css({ fontSize: "xl", fontWeight: "bold" })}>
									{formatBalance(totalClaimed as bigint | undefined)}
								</Text>
							</div>

							{/* Available to Claim */}
							<div
								className={css({
									p: "4",
									borderRadius: "md",
									border: "1px solid",
									borderColor: claimableAmount > 0n ? "green.7" : "border",
									bg:
										claimableAmount > 0n ? "green.subtle.bg" : "gray.subtle.bg",
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: "2",
								})}
							>
								<Text className={css({ fontSize: "xs", color: "fg.muted" })}>
									Available
								</Text>
								<Text
									className={css({
										fontSize: "xl",
										fontWeight: "bold",
										color: claimableAmount > 0n ? "green.11" : "fg.default",
									})}
								>
									{claimableAmount.toString()}
								</Text>
								{airdropStatus?.status === "pending" && (
									<Badge variant="surface" colorPalette="amber" size="sm">
										<Loader2
											className={css({
												width: "3",
												height: "3",
												animation: "spin",
											})}
										/>
										Pending
									</Badge>
								)}
							</div>
						</div>

						{/* Claim messages */}
						{claimError && (
							<div
								className={css({
									p: "3",
									borderRadius: "md",
									border: "1px solid",
									borderColor: "red.7",
									bg: "red.subtle.bg",
									display: "flex",
									alignItems: "center",
									gap: "2",
								})}
							>
								<XCircle
									className={css({ width: "5", height: "5", color: "red.11" })}
								/>
								<div className={css({ flex: 1 })}>
									<Text
										className={css({
											fontWeight: "medium",
											fontSize: "sm",
											color: "red.12",
										})}
									>
										{claimError.split("\n")[0]}
									</Text>
								</div>
								<Button
									onClick={() => setClaimError(null)}
									size="sm"
									variant="plain"
									className={css({ flexShrink: 0 })}
								>
									Dismiss
								</Button>
							</div>
						)}

						{claimSuccess && (
							<div
								className={css({
									p: "3",
									borderRadius: "md",
									border: "1px solid",
									borderColor: "green.7",
									bg: "green.subtle.bg",
									display: "flex",
									alignItems: "center",
									gap: "2",
								})}
							>
								<CheckCircle
									className={css({
										width: "5",
										height: "5",
										color: "green.11",
									})}
								/>
								<div className={css({ flex: 1 })}>
									<Text
										className={css({
											fontWeight: "medium",
											fontSize: "sm",
											color: "green.12",
										})}
									>
										Claim triggered! Tokens will be transferred shortly.
									</Text>
								</div>
								<Button
									onClick={() => setClaimSuccess(false)}
									size="sm"
									variant="plain"
									className={css({ flexShrink: 0 })}
								>
									Dismiss
								</Button>
							</div>
						)}

						{/* Claim Button - Always visible */}
						<Button
							onClick={handleClaim}
							disabled={!canClaim || isClaiming || statusLoading}
							className={css({ width: "100%" })}
						>
							{isClaiming ? (
								<>
									<Loader2
										className={css({
											width: "4",
											height: "4",
											animation: "spin",
										})}
									/>
									Claiming...
								</>
							) : statusLoading ? (
								<>
									<Loader2
										className={css({
											width: "4",
											height: "4",
											animation: "spin",
										})}
									/>
									Loading...
								</>
							) : airdropStatus?.status === "pending" ? (
								<>
									<Loader2
										className={css({
											width: "4",
											height: "4",
											animation: "spin",
										})}
									/>
									Claim in Progress...
								</>
							) : airdropStatus?.allocatedAmount === "0" &&
								airdropStatus?.provedAmount === "0" ? (
								<>
									<Gift className={css({ width: "4", height: "4" })} />
									Not Allocated
								</>
							) : needsSync && claimableAmount === 0n ? (
								<>
									<RefreshCw className={css({ width: "4", height: "4" })} />
									Sync Required
								</>
							) : claimableAmount === 0n ? (
								<>
									<CheckCircle className={css({ width: "4", height: "4" })} />
									Nothing to Claim
								</>
							) : (
								<>
									<Gift className={css({ width: "4", height: "4" })} />
									Claim {claimableAmount.toString()} Tokens
								</>
							)}
						</Button>
					</Card.Body>
				</Card.Root>
			)}
		</div>
	);
}

function StepCard({
	title,
	imageSrc,
	imageSrcSet,
	description,
}: {
	title: string;
	imageSrc: string;
	imageSrcSet?: string;
	description: string;
}) {
	return (
		<div
			className={cx(
				section({ hoverable: true }),
				css({
					alignItems: "center",
					textAlign: "center",
					overflow: "hidden",
				}),
			)}
		>
			<div
				className={css({
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					mb: "1",
				})}
			>
				<img
					src={imageSrc}
					srcSet={imageSrcSet}
					alt={title}
					className={css({
						width: "20",
						height: "20",
						objectFit: "contain",
					})}
				/>
			</div>
			<Text
				className={css({
					fontSize: "sm",
					fontWeight: "medium",
					color: "fg.default",
				})}
			>
				{title}
			</Text>
			<Text className={css({ fontSize: "xs", color: "fg.subtle" })}>
				{description}
			</Text>
		</div>
	);
}
