import {
	CheckCircle,
	Coins,
	ExternalLink,
	FileSpreadsheet,
	Loader2,
	RefreshCw,
	ShieldCheck,
	Upload,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { css } from "styled-system/css";
import { formatUnits, isAddress, parseUnits } from "viem";
import {
	useAccount,
	useChainId,
	useReadContract,
	useSwitchChain,
	useWaitForTransactionReceipt,
	useWriteContract,
} from "wagmi";
import {
	Badge,
	Button,
	Card,
	Field,
	Input,
	NumberInput,
	Text,
} from "~/components/ui";
import { AddToWalletButton } from "~/components/add-to-wallet-button";
import { useSpreadsheetData } from "~/hooks/useSpreadsheetData";
import { compliantTokenAbi, COMPLIANT_TOKEN_ADDRESS } from "~/config/contracts";
import { sepolia } from "viem/chains";
import type { Route } from "./+types/compliant-token";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Compliant Token - CRE Examples" },
		{
			name: "description",
			content:
				"Sync Google Spreadsheet allowlist to ERC20 token contract using CRE",
		},
	];
}

const SPREADSHEET_URL =
	"https://docs.google.com/spreadsheets/d/1qbeYZqDWH4doO4BuHZYnJYhNCgPhQLJdFgKQw8xAxfo/edit";

const ETHERSCAN_BASE = "https://sepolia.etherscan.io";

function formatAddress(address: string): string {
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatBalance(balance: bigint | undefined): string {
	if (balance === undefined) return "—";
	return Number(formatUnits(balance, 0)).toFixed(0);
}

export default function CompliantToken() {
	const { isConnected, address } = useAccount();
	const chainId = useChainId();
	const { switchChainAsync } = useSwitchChain();

	const [mintRecipient, setMintRecipient] = useState("");
	const [mintAmount, setMintAmount] = useState("0");
	const [isSyncing, setIsSyncing] = useState(false);
	const [syncError, setSyncError] = useState<string | null>(null);
	const [isRefreshingAllowlist, setIsRefreshingAllowlist] = useState(false);

	const { addresses: spreadsheetData, loading: loadingSpreadsheet, refetch: refetchSpreadsheet } =
		useSpreadsheetData();

	const isSepoliaChain = chainId === sepolia.id;

	// Read allowlist
	const { data: allowlist, refetch: refetchAllowlist, isLoading: isLoadingAllowlist } = useReadContract({
		chainId: sepolia.id,
		address: COMPLIANT_TOKEN_ADDRESS,
		abi: compliantTokenAbi,
		functionName: "allowlist",
		query: {
			enabled: isSepoliaChain,
		},
	});

	// Read token name
	const { data: tokenName } = useReadContract({
		chainId: sepolia.id,
		address: COMPLIANT_TOKEN_ADDRESS,
		abi: compliantTokenAbi,
		functionName: "name",
		query: {
			enabled: isSepoliaChain,
		},
	});

	// Read total supply
	const { data: totalSupply } = useReadContract({
		chainId: sepolia.id,
		address: COMPLIANT_TOKEN_ADDRESS,
		abi: compliantTokenAbi,
		functionName: "totalSupply",
		query: {
			enabled: isSepoliaChain,
		},
	});

	// Read user balance
	const { data: userBalance } = useReadContract({
		chainId: sepolia.id,
		address: COMPLIANT_TOKEN_ADDRESS,
		abi: compliantTokenAbi,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
		query: {
			enabled: isSepoliaChain && !!address,
		},
	});

	// Mint write contract
	const {
		writeContract: executeMint,
		data: mintHash,
		isPending: isMintPending,
		error: mintError,
		reset: resetMint,
	} = useWriteContract();

	const { data: mintReceipt, status: mintStatus } =
		useWaitForTransactionReceipt({ hash: mintHash });

	// Validation helpers
	const isValidAddress = (addr: string) => isAddress(addr);
	const allowlistArray = Array.isArray(allowlist) ? allowlist : [];
	const isAddressInAllowlist = (addr: string) =>
		allowlistArray.some((a) => a.toLowerCase() === addr.toLowerCase());
	const userInAllowlist =
		address && isAddressInAllowlist(address.toLowerCase());

	// Mint handlers
	const handleMint = async () => {
		if (!isValidAddress(mintRecipient)) {
			alert("Invalid Ethereum address");
			return;
		}

		if (!isAddressInAllowlist(mintRecipient)) {
			alert("Address not in allowlist");
			return;
		}

		const amount = parseUnits(mintAmount, 0);
		if (amount <= 0n || amount > parseUnits("1000", 0)) {
			alert("Amount must be between 0 and 1000");
			return;
		}

		executeMint({
			address: COMPLIANT_TOKEN_ADDRESS,
			abi: compliantTokenAbi,
			functionName: "mint",
			args: [mintRecipient as `0x${string}`, amount],
		});
	};

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

			const serverUrl = import.meta.env.VITE_CRE_HELPER_SERVER_URL || "http://localhost:3000";
			const apiKey = import.meta.env.VITE_CRE_HELPER_BEARER_TOKEN;

			if (!apiKey) {
				throw new Error("Missing API key (VITE_CRE_HELPER_BEARER_TOKEN)");
			}

			const response = await fetch(`${serverUrl}/02-compliance/sync`, {
				method: "POST",
				headers: { "X-API-Key": apiKey },
			});

			if (!response.ok) {
				const errorBody = await response.text().catch(() => "");
				throw new Error(`Failed to sync (HTTP ${response.status}): ${errorBody}`);
			}

			// Refresh both lists after successful sync
			await refetchSpreadsheet();
			setIsRefreshingAllowlist(true);
			await refetchAllowlist();
			setIsRefreshingAllowlist(false);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to sync allowlist";
			console.error(message, error);
			setSyncError(message);
		} finally {
			setIsSyncing(false);
		}
	};

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
						Compliant Token
					</Text>
					<Text className={css({ color: "fg.muted", fontSize: "lg" })}>
						Sync Google Spreadsheet allowlist to ERC20 token contract
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
						Contract Read/Write
					</Badge>
					<Badge variant="subtle" colorPalette="gray" size="md">
						Google Sheets
					</Badge>
				</div>
			</div>

			{/* Context Card */}
			<Card.Root variant="outline">
				<Card.Header>
					<Card.Title>Context</Card.Title>
					<Card.Description></Card.Description>
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
							Compliance specialists need to manage who can receive or transfer
							tokens, but working with wallets, private keys, and blockchain
							transactions is complex and error-prone for non-technical users.
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
							Manage allowlist from a familiar Google Sheet interface. CRE
							automatically syncs changes to the on-chain contract—no wallet or
							blockchain knowledge required.
						</Text>
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
						<ShieldCheck
							className={css({
								width: "4",
								height: "4",
								color: "teal.11",
								flexShrink: 0,
							})}
						/>
						<div>
							<Text className={css({ fontWeight: "medium", fontSize: "sm" })}>
								{tokenName || "Compliant Token"}
							</Text>
							<a
								href={`${ETHERSCAN_BASE}/address/${COMPLIANT_TOKEN_ADDRESS}`}
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
								{formatAddress(COMPLIANT_TOKEN_ADDRESS)}
								<ExternalLink className={css({ width: "2.5", height: "2.5" })} />
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
							address={COMPLIANT_TOKEN_ADDRESS}
							symbol="TCT"
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
									color: "teal.11",
								})}
							/>
							<Text className={css({ fontWeight: "medium" })}>
								{formatBalance(totalSupply)}
							</Text>
							<Text className={css({ color: "fg.subtle", fontSize: "xs" })}>
								Total Supply
							</Text>
						</div>
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
								{formatBalance(userBalance)}
							</Text>
							<Text className={css({ color: "fg.subtle", fontSize: "xs" })}>
								Your Balance
							</Text>
						</div>
						{userInAllowlist && (
							<Badge variant="surface" colorPalette="green" size="sm">
								<CheckCircle className={css({ width: "3", height: "3" })} />
								Allowlisted
							</Badge>
						)}
						{!userInAllowlist && isConnected && (
							<Badge
								variant="outline"
								colorPalette="red"
								size="sm"
								title="Your address is not in the allowlist"
							>
								<XCircle className={css({ width: "3", height: "3" })} />
								Not Allowlisted
							</Badge>
						)}
					</div>
				</div>
			)}

			{!isConnected && (
				<Card.Root variant="outline">
					<Card.Body className={css({ py: "8", textAlign: "center" })}>
						<Text className={css({ color: "fg.muted" })}>
							Connect your wallet to continue
						</Text>
					</Card.Body>
				</Card.Root>
			)}

			{isConnected && !isSepoliaChain && (
				<Card.Root variant="outline" className={css({ borderColor: "red.7" })}>
					<Card.Body className={css({ display: "flex", gap: "4", alignItems: "center" })}>
						<XCircle className={css({ width: "5", height: "5", color: "red.11", flexShrink: 0 })} />
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

			{/* Mint Tokens Section */}
			{isConnected && isSepoliaChain && (
				<Card.Root variant="elevated">
					<Card.Header>
						<Card.Title>
							<div className={css({ display: "flex", alignItems: "center", gap: "2" })}>
								<Coins className={css({ width: "5", height: "5" })} />
								Mint Tokens
							</div>
						</Card.Title>
						<Card.Description>
							Mint tokens to an allowlisted address (max 1000 per mint)
						</Card.Description>
					</Card.Header>
					<Card.Body className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
						<div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
							<Field.Root>
								<Field.Label>Recipient Address</Field.Label>
								<Input
									type="text"
									placeholder="0x..."
									value={mintRecipient}
									onChange={(e) => setMintRecipient(e.target.value)}
									disabled={isMintPending}
								/>
								{mintRecipient &&
									!isValidAddress(mintRecipient) && (
										<Text className={css({ fontSize: "sm", color: "red.11" })}>
											Invalid address format
										</Text>
									)}
								{mintRecipient &&
									isValidAddress(mintRecipient) &&
									!isAddressInAllowlist(mintRecipient) && (
										<Text className={css({ fontSize: "sm", color: "red.11" })}>
											Address not in allowlist
										</Text>
									)}
							</Field.Root>

							<Field.Root>
								<Field.Label>Amount (max 1000)</Field.Label>
								<NumberInput.Root
									value={mintAmount}
									onValueChange={(e) => {
										const intValue = Math.floor(Number(e.value) || 0).toString();
										setMintAmount(intValue);
									}}
									disabled={isMintPending}
									min="0"
									max="1000"
									step="1"
								>
									<NumberInput.Input placeholder="0" />
								</NumberInput.Root>
							</Field.Root>
						</div>

						<Button
							onClick={handleMint}
							disabled={
								isMintPending ||
								!mintRecipient ||
								!isValidAddress(mintRecipient) ||
								!isAddressInAllowlist(mintRecipient) ||
								parseInt(mintAmount) <= 0 ||
								parseInt(mintAmount) > 1000
							}
							className={css({ width: "100%" })}
						>
							{isMintPending ? (
								<>
									<Loader2 className={css({ width: "4", height: "4", animation: "spin" })} />
									Minting...
								</>
							) : (
								<>
									<Coins className={css({ width: "4", height: "4" })} />
									Mint Tokens
								</>
							)}
						</Button>

						{mintStatus === "success" && mintReceipt && (
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
								<CheckCircle className={css({ width: "5", height: "5", color: "green.11" })} />
								<div>
									<Text className={css({ fontWeight: "medium", fontSize: "sm", color: "green.12" })}>
										Mint successful!
									</Text>
									<a
										href={`${ETHERSCAN_BASE}/tx/${mintReceipt.transactionHash}`}
										target="_blank"
										rel="noopener noreferrer"
										className={css({
											display: "inline-flex",
											alignItems: "center",
											gap: "1",
											color: "green.11",
											fontSize: "xs",
											_hover: { textDecoration: "underline" },
										})}
									>
										View Transaction
										<ExternalLink className={css({ width: "2.5", height: "2.5" })} />
									</a>
								</div>
								<Button
									onClick={() => {
										resetMint();
										setMintRecipient("");
										setMintAmount("0");
										refetchAllowlist();
									}}
									size="sm"
									variant="ghost"
									className={css({ ml: "auto" })}
								>
									Clear
								</Button>
							</div>
						)}

						{mintError && (
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
								<XCircle className={css({ width: "5", height: "5", color: "red.11" })} />
								<div>
									<Text className={css({ fontWeight: "medium", fontSize: "sm", color: "red.12" })}>
										Error: {mintError.message.split("\n")[0]}
									</Text>
								</div>
								<Button
									onClick={() => resetMint()}
									size="sm"
									variant="ghost"
									className={css({ ml: "auto" })}
								>
									Dismiss
								</Button>
							</div>
						)}
					</Card.Body>
				</Card.Root>
			)}

		{/* Allowed Accounts Comparison */}
			{isConnected && isSepoliaChain && (
				<Card.Root variant="outline">
					<Card.Header>
						<div className={css({ display: "flex", flexDirection: { base: "column", md: "row" }, justifyContent: "space-between", alignItems: { base: "flex-start", md: "flex-end" }, gap: "4" })}>
							<Card.Title>Allowed Accounts</Card.Title>
							<div className={css({ display: "flex", alignItems: "center", gap: "2", flexWrap: "wrap", justifyContent: { base: "flex-start", md: "flex-end" } })}>
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
									<ExternalLink className={css({ width: "3.5", height: "3.5" })} />
									Open Sheet
								</a>
								<Button
									onClick={() => {
										void refetchSpreadsheet();
										setIsRefreshingAllowlist(true);
										void refetchAllowlist().finally(() => setIsRefreshingAllowlist(false));
									}}
									variant="outline"
									size="sm"
									disabled={loadingSpreadsheet || isRefreshingAllowlist}
									className={css({ gap: "1" })}
								>
									<RefreshCw className={css({
										width: "4",
										height: "4",
										...(loadingSpreadsheet || isRefreshingAllowlist ? { animation: "spin" } : {})
									})} />
									Refresh All
								</Button>
								<Button
									onClick={() => void handleSync()}
									disabled={isSyncing}
									variant="outline"
									size="sm"
									className={css({ gap: "1" })}
								>
									{isSyncing ? (
										<>
											<Loader2 className={css({ width: "3.5", height: "3.5", animation: "spin" })} />
											Publishing...
										</>
									) : (
										<>
											<Upload className={css({ width: "3.5", height: "3.5" })} />
											Publish
										</>
									)}
								</Button>
							</div>
						</div>
					</Card.Header>
					<Card.Body className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
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
								<XCircle className={css({ width: "5", height: "5", color: "red.11" })} />
								<div className={css({ flex: 1 })}>
									<Text className={css({ fontWeight: "medium", fontSize: "sm", color: "red.12" })}>
										{syncError.split("\n")[0]}
									</Text>
								</div>
								<Button
									onClick={() => setSyncError(null)}
									size="sm"
									variant="ghost"
									className={css({ flexShrink: 0 })}
								>
									Dismiss
								</Button>
							</div>
						)}
						<div
							className={css({
								display: "grid",
								gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
								gap: "6",
							})}
						>
						{/* Spreadsheet Column */}
						<div className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
							<div
								className={css({
									display: "flex",
									alignItems: "center",
									gap: "2",
									pb: "3",
									borderBottom: "1px solid",
									borderColor: "border",
								})}
							>
								<FileSpreadsheet className={css({ width: "4", height: "4" })} />
								<div>
									<Text className={css({ fontWeight: "medium" })}>
										Spreadsheet
									</Text>
									<Text className={css({ fontSize: "xs", color: "fg.muted" })}>
										{spreadsheetData.length} addresses
									</Text>
								</div>
							</div>

							<div
								className={css({
									display: "flex",
									flexDirection: "column",
									gap: "2",
									maxHeight: "300px",
									overflowY: "auto",
								})}
							>
								{spreadsheetData.length > 0 ? (
									spreadsheetData.map((addr) => (
										<div
											key={addr}
											className={css({
												p: "2",
												borderRadius: "md",
												border: "1px solid",
												borderColor: "border",
												bg: "gray.subtle.bg",
												fontSize: "sm",
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
												gap: "2",
											})}
										>
											<a
												href={`${ETHERSCAN_BASE}/address/${addr}`}
												target="_blank"
												rel="noopener noreferrer"
												className={css({
													color: "teal.11",
													_hover: { textDecoration: "underline" },
												})}
											>
												{formatAddress(addr)}
											</a>
											{isAddressInAllowlist(addr) && (
												<CheckCircle className={css({ width: "3.5", height: "3.5", color: "green.11" })} />
											)}
											{!isAddressInAllowlist(addr) && (
												<Badge variant="subtle" colorPalette="amber" size="xs">
													New
												</Badge>
											)}
										</div>
									))
								) : (
									<Text className={css({ color: "fg.muted", textAlign: "center", py: "4", fontSize: "sm" })}>
										{loadingSpreadsheet ? "Loading..." : "No addresses"}
									</Text>
								)}
							</div>
						</div>

						{/* Contract Column */}
						<div className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
							<div
								className={css({
									display: "flex",
									alignItems: "center",
									gap: "2",
									pb: "3",
									borderBottom: "1px solid",
									borderColor: "border",
								})}
							>
								<ShieldCheck className={css({ width: "4", height: "4" })} />
								<div>
									<Text className={css({ fontWeight: "medium" })}>
										Token Contract
									</Text>
									<Text className={css({ fontSize: "xs", color: "fg.muted" })}>
										{allowlistArray.length} addresses
									</Text>
								</div>
							</div>

							<div
								className={css({
									display: "flex",
									flexDirection: "column",
									gap: "2",
									maxHeight: "300px",
									overflowY: "auto",
								})}
							>
								{allowlistArray.length > 0 ? (
									allowlistArray.map((addr) => (
										<div
											key={addr}
											className={css({
												p: "2",
												borderRadius: "md",
												border: "1px solid",
												borderColor: "border",
												bg: "gray.subtle.bg",
												fontSize: "sm",
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
												gap: "2",
											})}
										>
											<a
												href={`${ETHERSCAN_BASE}/address/${addr}`}
												target="_blank"
												rel="noopener noreferrer"
												className={css({
													color: "teal.11",
													_hover: { textDecoration: "underline" },
												})}
											>
												{formatAddress(addr)}
											</a>
											{addr.toLowerCase() === address?.toLowerCase() && (
												<Badge variant="subtle" colorPalette="green" size="xs">
													You
												</Badge>
											)}
											{spreadsheetData.some(a => a.toLowerCase() === addr.toLowerCase()) && (
												<CheckCircle className={css({ width: "3.5", height: "3.5", color: "green.11" })} />
											)}
										{!spreadsheetData.some(a => a.toLowerCase() === addr.toLowerCase()) && (
											<Badge variant="subtle" colorPalette="red" size="xs">
												Remove
											</Badge>
										)}
										</div>
									))
								) : (
									<Text className={css({ color: "fg.muted", textAlign: "center", py: "4", fontSize: "sm" })}>
										No addresses in allowlist
									</Text>
								)}
							</div>

						</div>
						</div>
					</Card.Body>
				</Card.Root>
			)}

		</div>
	);
}