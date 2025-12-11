import { createListCollection } from "@ark-ui/react/select";
import {
	ArrowLeftRight,
	ArrowRight,
	CheckCircle,
	Clock,
	ExternalLink,
	Globe2,
	Loader2,
	ShieldCheck,
	Sparkles,
	XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { css } from "styled-system/css";
import { formatUnits, maxUint256 } from "viem";
import {
	useAccount,
	useChainId,
	useReadContract,
	useWaitForTransactionReceipt,
	useWriteContract,
} from "wagmi";
import {
	Badge,
	Button,
	Card,
	Field,
	NumberInput,
	Select,
	Text,
} from "~/components/ui";
import {
	CIRCLE_FAUCET_URL,
	erc20Abi,
	TOKEN_MESSENGER_ADDRESSES,
	USDC_ADDRESSES,
} from "~/config/contracts";
import type { Route } from "./+types/cross-chain-relayer";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Cross-Chain Relayer - CRE Examples" },
		{
			name: "description",
			content:
				"Bridge USDC cross-chain using Circle's CCTP with CRE attestation relay",
		},
	];
}

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

const STATUS_ACCENT: Record<TransferStatus, string> = {
	idle: "gray.6",
	pending: "amber.7",
	attesting: "teal.8",
	relaying: "blue.8",
	completed: "green.8",
	failed: "red.8",
};

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

export default function CrossChainRelayer() {
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

	const handleSwapChains = () => {
		if (!sourceChain.length && !destChain.length) return;
		setSourceChain(destChain.length ? [destChain[0]] : []);
		setDestChain(sourceChain.length ? [sourceChain[0]] : []);
	};

	return (
		<div
			className={css({
				maxWidth: "5xl",
				mx: "auto",
				p: { base: "5", md: "8" },
				display: "flex",
				flexDirection: "column",
				gap: "6",
				backgroundImage:
					"radial-gradient(circle at 8% 10%, rgba(16, 185, 129, 0.12), transparent 38%), radial-gradient(circle at 90% 0%, rgba(59, 130, 246, 0.12), transparent 34%)",
				borderRadius: "2xl",
				boxShadow: "0 18px 46px rgba(15, 23, 42, 0.08)",
			})}
		>
			<div
				className={css({
					display: "flex",
					flexDirection: { base: "column", md: "row" },
					justifyContent: "space-between",
					alignItems: { base: "flex-start", md: "center" },
					gap: "4",
					p: { base: "3", md: "4" },
					borderRadius: "xl",
					border: "1px solid",
					borderColor: "border",
					boxShadow: "0 12px 38px rgba(15, 23, 42, 0.08)",
					backgroundImage:
						"linear-gradient(135deg, rgba(20,184,166,0.1), rgba(59,130,246,0.08))",
				})}
			>
				<div>
					<Text
						as="h1"
						className={css({
							fontSize: "2xl",
							fontWeight: "bold",
							mb: "2",
						})}
					>
						Cross-Chain Relayer
					</Text>
					<Text className={css({ color: "fg.muted" })}>
						Bridge USDC cross-chain using Circle's CCTP with CRE attestation
						relay
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
					<Badge variant="surface" colorPalette="teal" size="sm">
						CCTP ready
					</Badge>
					<Badge variant="subtle" colorPalette="gray" size="sm">
						CRE attestation relay
					</Badge>
					<Badge variant="outline" colorPalette="blue" size="sm">
						Testnet flows
					</Badge>
				</div>
				</div>

				{isConnected && (
					<div
						className={css({
							display: "flex",
							flexDirection: { base: "column", md: "row" },
							gap: "3",
							alignItems: { base: "stretch", md: "center" },
							justifyContent: "space-between",
							p: "3",
							borderRadius: "xl",
							border: "1px solid",
							borderColor: "border",
							bg: "white",
							boxShadow: "0 10px 26px rgba(15, 23, 42, 0.06)",
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
							<ShieldCheck className={css({ width: "4", height: "4", color: "teal.11" })} />
							Secure & connected to
							<Badge variant="solid" colorPalette="teal">
								{currentChain?.label ?? "Select source"}
							</Badge>
						</div>
						<div
							className={css({
								display: "flex",
								gap: "3",
								flexWrap: "wrap",
								justifyContent: "flex-end",
								alignItems: "center",
								fontSize: "sm",
							})}
						>
							<div
								className={css({
									display: "flex",
									alignItems: "center",
									gap: "2",
									bg: "gray.2",
									borderRadius: "md",
									px: "3",
									py: "2",
								})}
							>
								<Sparkles className={css({ width: "4", height: "4", color: "teal.11" })} />
								<Text className={css({ fontWeight: "medium" })}>
									{formatBalance(sourceBalance)} USDC
								</Text>
								<Text className={css({ color: "fg.subtle" })}>
									{sourceChainData?.label ?? currentChain?.label ?? "Source"}
								</Text>
							</div>
							<div
								className={css({
									display: "flex",
									alignItems: "center",
									gap: "2",
									bg: "gray.2",
									borderRadius: "md",
									px: "3",
									py: "2",
								})}
							>
								<Globe2 className={css({ width: "4", height: "4", color: "blue.11" })} />
								<Text className={css({ fontWeight: "medium" })}>
									{destChainId ? `${formatBalance(destBalance)} USDC` : "—"}
								</Text>
								<Text className={css({ color: "fg.subtle" })}>
									{destChainData?.label ?? "Destination"}
								</Text>
							</div>
							<a
								href={CIRCLE_FAUCET_URL}
								target="_blank"
								rel="noopener noreferrer"
								className={css({
									display: "inline-flex",
									alignItems: "center",
									gap: "1",
									color: "teal.11",
									fontWeight: "medium",
									_hover: { textDecoration: "underline" },
								})}
							>
								Get testnet USDC
								<ExternalLink className={css({ width: "3", height: "3" })} />
							</a>
						</div>
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
							gap: { base: "3", md: "4" },
							alignItems: "center",
							border: "1px solid",
							borderColor: "border",
							borderRadius: "lg",
							p: { base: "3", md: "4" },
							bg: "white",
							boxShadow: "0 10px 26px rgba(15, 23, 42, 0.04)",
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

							<div
								className={css({
									display: { base: "none", md: "flex" },
									flexDirection: "column",
									alignItems: "center",
									gap: "2",
									justifySelf: "center",
								})}
							>
								<div
									className={css({
										width: "10",
										height: "10",
										borderRadius: "full",
										display: "grid",
										placeItems: "center",
										backgroundImage:
											"linear-gradient(135deg, rgb(34 197 94), rgb(59 130 246))",
										color: "white",
										boxShadow: "0 14px 32px rgba(34, 197, 94, 0.28)",
									})}
								>
									<ArrowRight className={css({ width: "5", height: "5" })} />
								</div>
								<Button
									variant="subtle"
									size="sm"
									onClick={handleSwapChains}
									className={css({
										display: "inline-flex",
										alignItems: "center",
										gap: "2",
									})}
								>
									<ArrowLeftRight className={css({ width: "4", height: "4" })} />
									Swap
								</Button>
							</div>

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

					{sourceChainData && destChainData && (
						<div
							className={css({
								display: "flex",
								alignItems: "center",
								gap: "2",
								color: "teal.11",
								bg: "teal.2",
								border: "1px solid",
								borderColor: "teal.4",
								borderRadius: "md",
								p: "3",
							})}
						>
							<Sparkles className={css({ width: "4", height: "4" })} />
							<Text className={css({ fontSize: "sm" })}>
								Route locked: {sourceChainData.label} → {destChainData.label} with
								CRE attestations
							</Text>
						</div>
					)}

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
									gap: "4",
									p: "4",
									bg: "white",
									borderRadius: "md",
									border: "1px solid",
									borderColor: "border",
									boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
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
									{isApproved && (
										<Badge
											variant="surface"
											colorPalette="teal"
											size="sm"
											className={css({ mt: "2", display: "inline-flex", gap: "2" })}
										>
											<ShieldCheck className={css({ width: "3", height: "3" })} />
											Unlimited allowance
										</Badge>
									)}
								</div>
						{!isApproved ? (
							<Button
								variant="solid"
								disabled={isApproving || isApproveConfirming}
								loading={isApproving || isApproveConfirming}
								loadingText="Approving..."
								onClick={handleApprove}
							>
								Approve USDC
							</Button>
						) : (
							<Badge
								variant="solid"
								colorPalette="green"
								className={css({
									display: "inline-flex",
									alignItems: "center",
									gap: "2",
									px: "3",
									py: "2",
								})}
							>
								<CheckCircle className={css({ width: "4", height: "4" })} />
								Approved
							</Badge>
						)}
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
											bg: "white",
											borderRadius: "md",
											border: "1px solid",
											borderColor: "border",
											borderLeft: "4px solid",
											borderLeftColor: STATUS_ACCENT[transfer.status],
											boxShadow: "0 8px 18px rgba(15, 23, 42, 0.05)",
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
									<Text className={css({ fontSize: "xs", color: "fg.subtle" })}>
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
		</div>
	);
}
