import { createListCollection } from "@ark-ui/react/select";
import {
	ArrowLeftRight,
	CheckCircle,
	ExternalLink,
	Globe2,
	Loader2,
	ShieldCheck,
	Sparkles,
	XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { css } from "styled-system/css";
import { formatUnits, maxUint256, pad, parseEventLogs, parseUnits } from "viem";
import {
	useAccount,
	useChainId,
	useReadContract,
	useSwitchChain,
	useWaitForTransactionReceipt,
	useWriteContract,
} from "wagmi";
import { BridgeProgress } from "~/components/bridge-progress";
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
	CCTP_DOMAINS,
	depositForBurnEventAbi,
	FINALITY_THRESHOLD,
	fetchBridgeFee,
	TOKEN_MESSENGER_V2_ADDRESS,
	tokenMessengerAbi,
} from "~/config/cctp";
import {
	CIRCLE_FAUCET_URL,
	erc20Abi,
	USDC_ADDRESSES,
} from "~/config/contracts";
import type { config } from "~/config/wagmi";
import { useBridgeTransfer } from "~/hooks/useBridgeEvents";
import type { clientAction as whitelistAction } from "~/routes/resources/whitelist";
import type { Route } from "./+types/cross-chain-relayer";

export function meta(_args: Route.MetaArgs) {
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
	chainId: (typeof config)["chains"][number]["id"];
}

const CHAINS: ChainItem[] = [
	{ value: "sepolia", label: "Ethereum Sepolia", chainId: 11155111 },
	{ value: "base-sepolia", label: "Base Sepolia", chainId: 84532 },
	{ value: "arbitrum-sepolia", label: "Arbitrum Sepolia", chainId: 421614 },
];

function formatBalance(balance: bigint | undefined): string {
	if (balance === undefined) return "—";
	return Number(formatUnits(balance, 6)).toFixed(2);
}

const UNLIMITED_THRESHOLD = maxUint256 / 2n;

export default function CrossChainRelayer() {
	const { isConnected, address } = useAccount();
	const chainId = useChainId();
	const { switchChainAsync } = useSwitchChain();
	const [amount, setAmount] = useState("0");
	const [sourceChain, setSourceChain] = useState<string[]>([]);
	const [destChain, setDestChain] = useState<string[]>([]);
	const whitelistFetcher = useFetcher<typeof whitelistAction>();
	const lastWhitelistAddress = useRef<string | null>(null);

	const currentChain = CHAINS.find((c) => c.chainId === chainId);
	const sourceChainData = CHAINS.find((c) => c.value === sourceChain[0]);
	const destChainData = CHAINS.find((c) => c.value === destChain[0]);

	const {
		transfer,
		reset: resetTransfer,
		startPending,
		setDeposited,
	} = useBridgeTransfer({
		walletAddress: address,
		sourceChainId: sourceChainData?.chainId,
		destChainId: destChainData?.chainId,
	});

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
			chainId: sourceChainData?.chainId,
			address: sourceChainData
				? USDC_ADDRESSES[sourceChainData.chainId]
				: undefined,
			abi: erc20Abi,
			functionName: "balanceOf",
			args: address ? [address] : undefined,
			query: { enabled: !!address && !!sourceChainData },
		});

	const { data: destBalance } = useReadContract({
		chainId: destChainId,
		address: destChainId ? USDC_ADDRESSES[destChainId] : undefined,
		abi: erc20Abi,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
		query: {
			enabled: !!address && !!destChainId,
		},
	});

	const sourceUsdcAddress = sourceChainData
		? USDC_ADDRESSES[sourceChainData.chainId]
		: undefined;

	const { data: currentAllowance, refetch: refetchAllowance } = useReadContract(
		{
			chainId: sourceChainData?.chainId,
			address: sourceUsdcAddress,
			abi: erc20Abi,
			functionName: "allowance",
			args: address ? [address, TOKEN_MESSENGER_V2_ADDRESS] : undefined,
			query: {
				enabled: !!address && !!sourceChainData && !!sourceUsdcAddress,
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

	const {
		writeContract: depositForBurn,
		data: burnTxHash,
		isPending: isBurning,
	} = useWriteContract();

	const { data: burnReceipt, isLoading: isBurnConfirming } =
		useWaitForTransactionReceipt({
			hash: burnTxHash,
		});

	useEffect(() => {
		if (isApproveSuccess) {
			refetchAllowance();
		}
	}, [isApproveSuccess, refetchAllowance]);

	useEffect(() => {
		if (!isConnected || !address) {
			lastWhitelistAddress.current = null;
			return;
		}

		if (lastWhitelistAddress.current === address) return;
		if (whitelistFetcher.state !== "idle") return;

		lastWhitelistAddress.current = address;
		whitelistFetcher.submit(
			{ address },
			{ method: "post", action: "/resources/whitelist" },
		);
	}, [isConnected, address, whitelistFetcher]);

	const isWhitelisting = whitelistFetcher.state !== "idle";
	const whitelistOk = !isWhitelisting && whitelistFetcher.data?.ok === true;
	const whitelistError =
		!isWhitelisting && whitelistFetcher.data && "error" in whitelistFetcher.data
			? whitelistFetcher.data.error
			: null;

	const handleApprove = async () => {
		if (!sourceChainData || !sourceUsdcAddress) return;

		if (chainId !== sourceChainData.chainId) {
			await switchChainAsync({ chainId: sourceChainData.chainId });
		}

		approveUsdc({
			address: sourceUsdcAddress,
			abi: erc20Abi,
			functionName: "approve",
			args: [TOKEN_MESSENGER_V2_ADDRESS, maxUint256],
		});
	};

	const handleTransfer = async () => {
		if (!sourceChainData || !destChainData || !address || !sourceUsdcAddress)
			return;

		if (chainId !== sourceChainData.chainId) {
			await switchChainAsync({ chainId: sourceChainData.chainId });
		}

		const amountInUnits = parseUnits(amount, 6);
		const mintRecipient = pad(address, { size: 32 });
		const sourceDomain = CCTP_DOMAINS[sourceChainData.chainId];
		const destinationDomain = CCTP_DOMAINS[destChainData.chainId];
		const destinationCaller = pad("0x0", { size: 32 });

		const maxFee = await fetchBridgeFee(
			sourceDomain,
			destinationDomain,
			amountInUnits,
			"FAST",
		);

		console.log("Fetched bridge fee:", formatUnits(maxFee, 6), "USDC");

		startPending();
		depositForBurn({
			address: TOKEN_MESSENGER_V2_ADDRESS,
			abi: tokenMessengerAbi,
			functionName: "depositForBurn",
			args: [
				amountInUnits,
				destinationDomain,
				mintRecipient,
				sourceUsdcAddress,
				destinationCaller,
				maxFee,
				FINALITY_THRESHOLD.FAST,
			],
		});
	};

	useEffect(() => {
		if (!burnReceipt || !sourceChainData || !address) return;

		const logs = parseEventLogs({
			abi: depositForBurnEventAbi,
			logs: burnReceipt.logs,
		});

		const depositEvent = logs.find(
			(log) =>
				log.eventName === "DepositForBurn" &&
				log.args.depositor?.toLowerCase() === address.toLowerCase(),
		);

		if (depositEvent?.args) {
			setDeposited(
				burnReceipt.transactionHash,
				depositEvent.args.depositor,
				depositEvent.args.amount,
				sourceChainData.chainId,
				depositEvent.args.destinationDomain,
			);
		}

		refetchSourceBalance();
	}, [
		burnReceipt,
		sourceChainData,
		address,
		setDeposited,
		refetchSourceBalance,
	]);

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
				py: { base: "6", md: "10" },
				px: { base: "4", md: "6" },
				display: "flex",
				flexDirection: "column",
				gap: "8",
			})}
		>
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
						Cross-Chain Relayer
					</Text>
					<Text className={css({ color: "fg.muted", fontSize: "lg" })}>
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
					<Badge variant="surface" colorPalette="teal" size="md">
						EVMLog Trigger
					</Badge>
					<Badge variant="subtle" colorPalette="gray" size="md">
						HTTP API Read
					</Badge>
					<Badge variant="outline" colorPalette="blue" size="md">
						EVM Write
					</Badge>
				</div>
			</div>

			<Card.Root variant="outline">
				<Card.Header>
					<Card.Title>Context</Card.Title>
					<Card.Description>
					</Card.Description>
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
							The extra claim transaction adds friction and can leave transfers
							unclaimed if a user doesn't come back to original bridge site.
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
							This example relays the destination claim txn for a whitelist of
							users, completing the bridge automatically. In this example the
							whitelist is populated with whomever interacts with this app.
						</Text>
					</div>
				</Card.Body>
			</Card.Root>

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
							className={css({ width: "4", height: "4", color: "teal.11" })}
						/>
						Secure & connected to
						<Badge variant="solid" colorPalette="teal">
							{currentChain?.label ?? "Select source"}
						</Badge>
						{isWhitelisting && (
							<Badge variant="outline" colorPalette="amber" size="sm">
								<Loader2
									className={css({
										width: "3",
										height: "3",
										animation: "spin",
									})}
								/>
								Whitelisting
							</Badge>
						)}
						{whitelistOk && (
							<Badge variant="outline" colorPalette="green" size="sm">
								<CheckCircle className={css({ width: "3", height: "3" })} />
								Whitelisted
							</Badge>
						)}
						{whitelistError && (
							<Badge
								variant="outline"
								colorPalette="red"
								size="sm"
								title={whitelistError}
							>
								<XCircle className={css({ width: "3", height: "3" })} />
								Whitelist failed
							</Badge>
						)}
					</div>
					<div
						className={css({
							display: "flex",
							gap: "4",
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
								bg: "gray.subtle.bg",
								borderRadius: "md",
								px: "3",
								py: "1.5",
							})}
						>
							<Sparkles
								className={css({
									width: "3.5",
									height: "3.5",
									color: "teal.11",
								})}
							/>
							<Text className={css({ fontWeight: "medium" })}>
								{formatBalance(sourceBalance)} USDC
							</Text>
							<Text className={css({ color: "fg.subtle", fontSize: "xs" })}>
								{sourceChainData?.label ?? currentChain?.label ?? "Source"}
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
							<Globe2
								className={css({
									width: "3.5",
									height: "3.5",
									color: "blue.11",
								})}
							/>
							<Text className={css({ fontWeight: "medium" })}>
								{destChainId ? `${formatBalance(destBalance)} USDC` : "—"}
							</Text>
							<Text className={css({ color: "fg.subtle", fontSize: "xs" })}>
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

			<Card.Root variant="elevated">
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
						gap: "6",
					})}
				>

					<div
						className={css({
							display: "grid",
							gridTemplateColumns: { base: "1fr", md: "1fr auto 1fr" },
							gap: { base: "4", md: "6" },
							alignItems: "end",
							p: { base: "4", md: "6" },
							bg: "gray.subtle.bg",
							borderRadius: "lg",
							border: "1px solid",
							borderColor: "border",
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
										<Select.Indicator />
									</Select.Trigger>
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
								pb: "2",
							})}
						>
							<Button
								variant="subtle"
								size="sm"
								onClick={handleSwapChains}
								className={css({
									borderRadius: "full",
									px: "3",
								})}
							>
								<ArrowLeftRight className={css({ width: "4", height: "4" })} />
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
										<Select.Indicator />
									</Select.Trigger>
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
							<NumberInput.Input />
							{/* <NumberInput.Control  /> */}
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
								bg: "gray.subtle.bg",
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
								{isApproved && (
									<Badge
										variant="surface"
										colorPalette="teal"
										size="sm"
										className={css({
											mt: "2",
											display: "inline-flex",
											gap: "2",
										})}
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
							!isApproved ||
							isBurning ||
							isBurnConfirming
						}
						loading={isBurning || isBurnConfirming}
						loadingText={isBurnConfirming ? "Confirming..." : "Signing..."}
						onClick={handleTransfer}
						size="lg"
						className={css({ width: { base: "full", md: "auto" } })}
					>
						Transfer USDC
					</Button>
				</Card.Footer>
			</Card.Root>

			<BridgeProgress transfer={transfer} onReset={resetTransfer} />

			{!isConnected && (
				<div
					className={css({
						textAlign: "center",
						p: "8",
						bg: "gray.subtle.bg",
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
