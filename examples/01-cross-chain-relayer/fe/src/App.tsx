import { createListCollection } from "@ark-ui/react/select";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
	ArrowRight,
	CheckCircle,
	Clock,
	ExternalLink,
	Loader2,
	XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formatUnits, maxUint256 } from "viem";
import {
	useAccount,
	useChainId,
	useReadContract,
	useWaitForTransactionReceipt,
	useWriteContract,
} from "wagmi";
import { css } from "../styled-system/css";
import {
	Badge,
	Button,
	Card,
	Field,
	NumberInput,
	Select,
	Text,
} from "./components/ui";
import {
	CIRCLE_FAUCET_URL,
	erc20Abi,
	TOKEN_MESSENGER_ADDRESSES,
	USDC_ADDRESSES,
} from "./config/contracts";

interface ChainItem {
	value: string;
	label: string;
	chainId: number;
}

const CHAINS: ChainItem[] = [
	{ value: "sepolia", label: "Ethereum Sepolia", chainId: 11155111 },
	{ value: "base-sepolia", label: "Base Sepolia", chainId: 84532 },
	{ value: "arbitrum-sepolia", label: "Arbitrum Sepolia", chainId: 421614 },
];

type TransferStatus =
	| "idle"
	| "pending"
	| "attesting"
	| "relaying"
	| "completed"
	| "failed";

interface Transfer {
	id: string;
	amount: string;
	from: string;
	to: string;
	status: TransferStatus;
	txHash?: string;
	timestamp: Date;
}

const MOCK_TRANSFERS: Transfer[] = [
	{
		id: "1",
		amount: "100.00",
		from: "Ethereum Sepolia",
		to: "Base Sepolia",
		status: "completed",
		txHash: "0x1234...5678",
		timestamp: new Date(Date.now() - 3600000),
	},
	{
		id: "2",
		amount: "50.00",
		from: "Base Sepolia",
		to: "Arbitrum Sepolia",
		status: "relaying",
		txHash: "0xabcd...efgh",
		timestamp: new Date(Date.now() - 1800000),
	},
];

function getStatusBadge(status: TransferStatus) {
	switch (status) {
		case "pending":
			return (
				<Badge variant="outline">
					<Clock className={css({ width: "3", height: "3" })} />
					Pending
				</Badge>
			);
		case "attesting":
			return (
				<Badge variant="outline" colorPalette="teal">
					<Loader2
						className={css({ width: "3", height: "3", animation: "spin" })}
					/>
					Attesting
				</Badge>
			);
		case "relaying":
			return (
				<Badge variant="outline" colorPalette="teal">
					<Loader2
						className={css({ width: "3", height: "3", animation: "spin" })}
					/>
					Relaying
				</Badge>
			);
		case "completed":
			return (
				<Badge variant="solid" colorPalette="green">
					<CheckCircle className={css({ width: "3", height: "3" })} />
					Completed
				</Badge>
			);
		case "failed":
			return (
				<Badge variant="solid" colorPalette="red">
					<XCircle className={css({ width: "3", height: "3" })} />
					Failed
				</Badge>
			);
		default:
			return <Badge variant="outline">Unknown</Badge>;
	}
}

function formatBalance(balance: bigint | undefined): string {
	if (balance === undefined) return "—";
	return formatUnits(balance, 6);
}

const UNLIMITED_THRESHOLD = maxUint256 / 2n;

function App() {
	const { isConnected, address } = useAccount();
	const chainId = useChainId();
	const [amount, setAmount] = useState("0");
	const [sourceChain, setSourceChain] = useState<string[]>([]);
	const [destChain, setDestChain] = useState<string[]>([]);
	const [transfers] = useState<Transfer[]>(MOCK_TRANSFERS);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const currentChain = CHAINS.find((c) => c.chainId === chainId);
	const sourceChainData = CHAINS.find((c) => c.value === sourceChain[0]);
	const destChainData = CHAINS.find((c) => c.value === destChain[0]);

	const sourceChainId = sourceChainData?.chainId ?? chainId;
	const destChainId = destChainData?.chainId;

	const chainsCollection = useMemo(
		() => createListCollection<ChainItem>({ items: CHAINS }),
		[],
	);

	const destChainsCollection = useMemo(
		() =>
			createListCollection<ChainItem>({
				items: CHAINS.filter((c) => c.value !== sourceChain[0]),
			}),
		[sourceChain],
	);

	const { data: sourceBalance, refetch: refetchSourceBalance } =
		useReadContract({
			address: USDC_ADDRESSES[sourceChainId],
			abi: erc20Abi,
			functionName: "balanceOf",
			args: address ? [address] : undefined,
			query: { enabled: !!address && !!USDC_ADDRESSES[sourceChainId] },
		});

	const { data: destBalance } = useReadContract({
		address: destChainId ? USDC_ADDRESSES[destChainId] : undefined,
		abi: erc20Abi,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
		query: {
			enabled: !!address && !!destChainId && !!USDC_ADDRESSES[destChainId],
		},
	});

	const { data: currentAllowance, refetch: refetchAllowance } = useReadContract(
		{
			address: USDC_ADDRESSES[sourceChainId],
			abi: erc20Abi,
			functionName: "allowance",
			args:
				address && TOKEN_MESSENGER_ADDRESSES[sourceChainId]
					? [address, TOKEN_MESSENGER_ADDRESSES[sourceChainId]]
					: undefined,
			query: {
				enabled:
					!!address &&
					!!USDC_ADDRESSES[sourceChainId] &&
					!!TOKEN_MESSENGER_ADDRESSES[sourceChainId],
			},
		},
	);

	const isApproved =
		currentAllowance !== undefined && currentAllowance >= UNLIMITED_THRESHOLD;

	const {
		writeContract: approveUsdc,
		data: approveTxHash,
		isPending: isApproving,
	} = useWriteContract();

	const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
		useWaitForTransactionReceipt({
			hash: approveTxHash,
		});

	if (isApproveSuccess) {
		refetchAllowance();
	}

	const handleApprove = () => {
		if (
			!USDC_ADDRESSES[sourceChainId] ||
			!TOKEN_MESSENGER_ADDRESSES[sourceChainId]
		)
			return;
		approveUsdc({
			address: USDC_ADDRESSES[sourceChainId],
			abi: erc20Abi,
			functionName: "approve",
			args: [TOKEN_MESSENGER_ADDRESSES[sourceChainId], maxUint256],
		});
	};

	const handleTransfer = async () => {
		setIsSubmitting(true);
		await new Promise((r) => setTimeout(r, 2000));
		setIsSubmitting(false);
		refetchSourceBalance();
	};

	return (
		<div
			className={css({
				minHeight: "100vh",
				bg: "gray.1",
				color: "fg.default",
			})}
		>
			<header
				className={css({
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					p: "4",
					borderBottom: "1px solid",
					borderColor: "border",
					bg: "gray.2",
				})}
			>
				<Text
					as="h1"
					className={css({
						fontSize: "xl",
						fontWeight: "bold",
						color: "teal.11",
					})}
				>
					Cross-Chain Relayer
				</Text>
				<ConnectButton showBalance={false} chainStatus="none" />
			</header>

			<main
				className={css({
					maxWidth: "4xl",
					mx: "auto",
					p: "6",
					display: "flex",
					flexDirection: "column",
					gap: "6",
				})}
			>
				{isConnected && (
					<div
						className={css({
							display: "grid",
							gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
							gap: "4",
						})}
					>
						<Card.Root>
							<Card.Header className={css({ pb: "2" })}>
								<Card.Title className={css({ fontSize: "md" })}>
									Source Balance
								</Card.Title>
							</Card.Header>
							<Card.Body className={css({ pt: "0" })}>
								<div
									className={css({
										display: "flex",
										alignItems: "baseline",
										gap: "2",
									})}
								>
									<Text
										className={css({
											fontSize: "2xl",
											fontWeight: "bold",
											color: "teal.11",
										})}
									>
										{formatBalance(sourceBalance)}
									</Text>
									<Text className={css({ color: "fg.muted" })}>USDC</Text>
								</div>
								<div
									className={css({
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										mt: "1",
									})}
								>
									<Text className={css({ fontSize: "xs", color: "fg.subtle" })}>
										{sourceChainData?.label ??
											currentChain?.label ??
											"Select chain"}
									</Text>
									<a
										href={CIRCLE_FAUCET_URL}
										target="_blank"
										rel="noopener noreferrer"
										className={css({
											display: "flex",
											alignItems: "center",
											gap: "1",
											fontSize: "xs",
											color: "teal.11",
											_hover: { textDecoration: "underline" },
										})}
									>
										Get testnet USDC
										<ExternalLink
											className={css({ width: "3", height: "3" })}
										/>
									</a>
								</div>
							</Card.Body>
						</Card.Root>

						<Card.Root>
							<Card.Header className={css({ pb: "2" })}>
								<Card.Title className={css({ fontSize: "md" })}>
									Destination Balance
								</Card.Title>
							</Card.Header>
							<Card.Body className={css({ pt: "0" })}>
								<div
									className={css({
										display: "flex",
										alignItems: "baseline",
										gap: "2",
									})}
								>
									<Text
										className={css({
											fontSize: "2xl",
											fontWeight: "bold",
											color: "teal.11",
										})}
									>
										{destChainId ? formatBalance(destBalance) : "—"}
									</Text>
									<Text className={css({ color: "fg.muted" })}>USDC</Text>
								</div>
								<Text
									className={css({
										fontSize: "xs",
										color: "fg.subtle",
										mt: "1",
									})}
								>
									{destChainData?.label ?? "Select destination"}
								</Text>
							</Card.Body>
						</Card.Root>
					</div>
				)}

				<Card.Root>
					<Card.Header>
						<Card.Title>Transfer USDC</Card.Title>
						<Card.Description>
							Bridge USDC cross-chain using Circle's CCTP with CRE attestation
							relay
						</Card.Description>
					</Card.Header>
					<Card.Body
						className={css({
							display: "flex",
							flexDirection: "column",
							gap: "4",
						})}
					>
						{isConnected && currentChain && (
							<div
								className={css({
									display: "flex",
									alignItems: "center",
									gap: "2",
									p: "2",
									bg: "teal.2",
									borderRadius: "md",
								})}
							>
								<Text className={css({ fontSize: "sm", color: "fg.muted" })}>
									Connected to:
								</Text>
								<Badge variant="solid" colorPalette="teal">
									{currentChain.label}
								</Badge>
							</div>
						)}

						<div
							className={css({
								display: "grid",
								gridTemplateColumns: { base: "1fr", md: "1fr auto 1fr" },
								gap: "4",
								alignItems: "end",
							})}
						>
							<Field.Root>
								<Select.Root
									collection={chainsCollection}
									value={sourceChain}
									onValueChange={(e) => setSourceChain(e.value)}
									disabled={!isConnected}
								>
									<Select.Label>Source Chain</Select.Label>
									<Select.Control>
										<Select.Trigger>
											<Select.ValueText placeholder="Select chain" />
										</Select.Trigger>
										<Select.Indicator />
									</Select.Control>
									<Select.Positioner>
										<Select.Content>
											{chainsCollection.items.map((chain) => (
												<Select.Item key={chain.value} item={chain}>
													<Select.ItemText>{chain.label}</Select.ItemText>
													<Select.ItemIndicator />
												</Select.Item>
											))}
										</Select.Content>
									</Select.Positioner>
								</Select.Root>
							</Field.Root>

							<ArrowRight
								className={css({
									color: "fg.muted",
									mb: "2",
									display: { base: "none", md: "block" },
								})}
							/>

							<Field.Root>
								<Select.Root
									collection={destChainsCollection}
									value={destChain}
									onValueChange={(e) => setDestChain(e.value)}
									disabled={!isConnected || !sourceChain.length}
								>
									<Select.Label>Destination Chain</Select.Label>
									<Select.Control>
										<Select.Trigger>
											<Select.ValueText placeholder="Select chain" />
										</Select.Trigger>
										<Select.Indicator />
									</Select.Control>
									<Select.Positioner>
										<Select.Content>
											{destChainsCollection.items.map((chain) => (
												<Select.Item key={chain.value} item={chain}>
													<Select.ItemText>{chain.label}</Select.ItemText>
													<Select.ItemIndicator />
												</Select.Item>
											))}
										</Select.Content>
									</Select.Positioner>
								</Select.Root>
							</Field.Root>
						</div>

						<Field.Root>
							<NumberInput.Root
								value={amount}
								onValueChange={(e) => setAmount(e.value)}
								min={0}
								step={0.01}
								formatOptions={{ style: "decimal", minimumFractionDigits: 2 }}
								disabled={!isConnected}
							>
								<NumberInput.Label>Amount (USDC)</NumberInput.Label>
								<div className={css({ display: "flex", gap: "2" })}>
									<NumberInput.Input />
									<NumberInput.Control />
								</div>
							</NumberInput.Root>
						</Field.Root>

						{isConnected && sourceChain.length > 0 && (
							<div
								className={css({
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									p: "3",
									bg: "gray.2",
									borderRadius: "md",
									border: "1px solid",
									borderColor: "border",
								})}
							>
								<div>
									<Text className={css({ fontWeight: "medium" })}>
										Token Approval
									</Text>
									<Text className={css({ fontSize: "sm", color: "fg.muted" })}>
										{isApproved
											? "USDC spending is approved"
											: "Approve USDC for cross-chain transfers"}
									</Text>
								</div>
								<Button
									variant={isApproved ? "outline" : "solid"}
									disabled={isApproved || isApproving || isApproveConfirming}
									loading={isApproving || isApproveConfirming}
									loadingText="Approving..."
									onClick={handleApprove}
								>
									{isApproved ? (
										<>
											<CheckCircle
												className={css({ width: "4", height: "4", mr: "2" })}
											/>
											Approved
										</>
									) : (
										"Approve USDC"
									)}
								</Button>
							</div>
						)}
					</Card.Body>
					<Card.Footer className={css({ justifyContent: "flex-end" })}>
						<Button
							disabled={
								!isConnected ||
								!sourceChain.length ||
								!destChain.length ||
								Number(amount) <= 0 ||
								!isApproved
							}
							loading={isSubmitting}
							loadingText="Processing..."
							onClick={handleTransfer}
						>
							Transfer USDC
						</Button>
					</Card.Footer>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Recent Transfers</Card.Title>
						<Card.Description>
							Track your cross-chain transfer history
						</Card.Description>
					</Card.Header>
					<Card.Body>
						{transfers.length === 0 ? (
							<Text
								className={css({
									textAlign: "center",
									py: "4",
									color: "fg.muted",
								})}
							>
								No transfers yet
							</Text>
						) : (
							<div
								className={css({
									display: "flex",
									flexDirection: "column",
									gap: "3",
								})}
							>
								{transfers.map((transfer) => (
									<div
										key={transfer.id}
										className={css({
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
											p: "3",
											bg: "gray.2",
											borderRadius: "md",
											border: "1px solid",
											borderColor: "border",
										})}
									>
										<div
											className={css({
												display: "flex",
												flexDirection: "column",
												gap: "1",
											})}
										>
											<div
												className={css({
													display: "flex",
													alignItems: "center",
													gap: "2",
												})}
											>
												<Text className={css({ fontWeight: "medium" })}>
													{transfer.amount} USDC
												</Text>
												{getStatusBadge(transfer.status)}
											</div>
											<div
												className={css({
													display: "flex",
													alignItems: "center",
													gap: "1",
												})}
											>
												<Text
													className={css({ fontSize: "sm", color: "fg.muted" })}
												>
													{transfer.from}
												</Text>
												<ArrowRight
													className={css({
														width: "3",
														height: "3",
														color: "fg.subtle",
													})}
												/>
												<Text
													className={css({ fontSize: "sm", color: "fg.muted" })}
												>
													{transfer.to}
												</Text>
											</div>
										</div>
										<Text
											className={css({ fontSize: "xs", color: "fg.subtle" })}
										>
											{transfer.timestamp.toLocaleTimeString()}
										</Text>
									</div>
								))}
							</div>
						)}
					</Card.Body>
				</Card.Root>

				{!isConnected && (
					<div
						className={css({
							textAlign: "center",
							p: "8",
							bg: "gray.2",
							borderRadius: "lg",
							border: "1px dashed",
							borderColor: "border",
						})}
					>
						<Text className={css({ color: "fg.muted" })}>
							Connect your wallet to start transferring USDC cross-chain
						</Text>
					</div>
				)}
			</main>
		</div>
	);
}

export default App;
