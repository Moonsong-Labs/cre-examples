import { createListCollection } from "@ark-ui/react/select";
import {
	Activity,
	ArrowLeftRight,
	Calculator,
	CheckCircle,
	ExternalLink,
	Eye,
	FileCheck,
	FileCode,
	Globe2,
	Loader2,
	Search,
	Send,
	ShieldCheck,
	Sparkles,
	TriangleAlert,
	User,
	Workflow,
	XCircle,
	Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useFetcher } from "react-router";
import { css } from "styled-system/css";
import {
	formatUnits,
	isAddress,
	maxUint256,
	pad,
	parseEventLogs,
	parseUnits,
} from "viem";
import {
	useAccount,
	useChainId,
	useReadContract,
	useSwitchChain,
	useWaitForTransactionReceipt,
	useWriteContract,
} from "wagmi";
import { BridgeProgress } from "~/components/bridge-progress";
import { ConfigWarningBanner } from "~/components/config-warning-banner";
import {
	Badge,
	Button,
	Card,
	Field,
	Input,
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
		{ title: "Automated Cross-Chain Relayer" },
		{
			name: "description",
			content:
				"Zero-friction USDC bridging powered by Chainlink Runtime Environment (CRE)",
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

const chainsCollection = createListCollection<ChainItem>({ items: CHAINS });

function formatBalance(balance: bigint | undefined): string {
	if (balance === undefined) return "—";
	return Number(formatUnits(balance, 6)).toFixed(2);
}

const UNLIMITED_THRESHOLD = maxUint256 / 2n;

const MINIMUM_AMOUNT = 1;

interface BridgeFormData {
	amount: string;
	sourceChain: string[];
	destChain: string[];
}

export default function CrossChainRelayer() {
	const { isConnected, address } = useAccount();
	const chainId = useChainId();
	const { switchChainAsync } = useSwitchChain();
	const whitelistFetcher = useFetcher<typeof whitelistAction>();

	const currentChain = CHAINS.find((c) => c.chainId === chainId);

	const {
		control,
		watch,
		setValue,
		formState: { errors },
	} = useForm<BridgeFormData>({
		mode: "onChange",
		defaultValues: {
			amount: "0",
			sourceChain: [],
			destChain: [],
		},
	});

	const sourceChain = watch("sourceChain");
	const destChain = watch("destChain");
	const amount = watch("amount");

	const [sameAsWallet, setSameAsWallet] = useState(true);
	const [recipientAddress, setRecipientAddress] = useState("");

	const handleToggleSameAsWallet = () => {
		if (sameAsWallet) {
			setSameAsWallet(false);
		} else {
			setSameAsWallet(true);
			setRecipientAddress(address ?? "");
		}
	};

	const sourceChainData = CHAINS.find((c) => c.value === sourceChain[0]);
	const destChainData = CHAINS.find((c) => c.value === destChain[0]);
	const destChainId = destChainData?.chainId;

	const destChainsCollection = createListCollection<ChainItem>({
		items: CHAINS.filter((c) => c.value !== sourceChain[0]),
	});

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

	const [whitelistedAddress, setWhitelistedAddress] = useState<string | null>(
		null,
	);

	useEffect(() => {
		if (!isConnected || !address) {
			setWhitelistedAddress(null);
			return;
		}

		if (whitelistedAddress === address) return;
		if (whitelistFetcher.state !== "idle") return;

		setWhitelistedAddress(address);
		whitelistFetcher.submit(
			{ address },
			{ method: "post", action: "/resources/whitelist" },
		);
	}, [isConnected, address, whitelistFetcher, whitelistedAddress]);

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

		const recipient = sameAsWallet ? address : recipientAddress;
		if (!recipient || !isAddress(recipient)) return;

		if (chainId !== sourceChainData.chainId) {
			await switchChainAsync({ chainId: sourceChainData.chainId });
		}

		const amountInUnits = parseUnits(amount, 6);
		const mintRecipient = pad(recipient, { size: 32 });
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
		const newSource = destChain[0] ? [destChain[0]] : [];
		const newDest = sourceChain[0] ? [sourceChain[0]] : [];
		setValue("sourceChain", newSource, { shouldValidate: true });
		setValue("destChain", newDest, { shouldValidate: true });
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
						Automated Cross-Chain Relayer
					</Text>
					<Text className={css({ color: "fg.muted", fontSize: "lg" })}>
						Zero-friction USDC bridging powered by Chainlink Runtime Environment
						(CRE)
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
						<Activity className={css({ width: "3.5", height: "3.5" })} />
						EVMLog Trigger
					</Badge>
					<Badge variant="subtle" colorPalette="gray" size="md">
						<Search className={css({ width: "3.5", height: "3.5" })} />
						HTTP API Read
					</Badge>
					<Badge variant="outline" colorPalette="blue" size="md">
						<Zap className={css({ width: "3.5", height: "3.5" })} />
						EVM Write
					</Badge>
				</div>
			</div>

			{/* How It Works Card */}
			<Card.Root variant="outline">
				<Card.Header>
					<Card.Title>How It Works</Card.Title>
					<Card.Description>
						Overcoming cross-chain friction with the Chainlink Runtime
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
					{/* Card 1: The Friction */}
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
								Problem: Manual Claims
							</Badge>
						</div>
						<Text className={css({ fontSize: "sm", color: "fg.muted" })}>
							Standard bridges require users to manually claim funds on the
							destination chain. This "two-step" process creates friction,
							requires gas on both chains, and often leads to unclaimed funds if
							users forget the second step.
						</Text>
					</div>

					{/* Card 2: The Solution */}
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
								Solution: Automated Relayer
							</Badge>
						</div>
						<Text className={css({ fontSize: "sm", color: "fg.muted" })}>
							By utilizing a CRE-based relayer, we can detect the deposit event on
							the source chain and automatically execute the claim transaction on
							the destination chain, creating a seamless "one-click" bridge
							experience.
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
								<strong>Monitor:</strong> Relayer watches for DepositForBurn events
								off-chain.
							</li>
							<li>
								<strong>Verify:</strong> Validates source events and checks
								authorized whitelist.
							</li>
							<li>
								<strong>Execute:</strong> Automatically calls receiveMessage on the
								destination chain.
							</li>
						</ul>
					</div>

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
							<Calculator className={css({ width: "4", height: "4" })} />
							<Text className={css({ fontWeight: "semibold", fontSize: "sm" })}>
								Protocol Mechanism
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
								title="Event Detection"
								imageSrc="/eye-scanner.png"
								description="Relayer captures CCTP Burn events including amount, domain, and recipient"
							/>
							<StepCard
								title="Attestation"
								imageSrc="/shield.png"
								description="CRE retrieves the Circle attestation once finality is reached on source"
							/>
							<StepCard
								title="Fulfillment"
								imageSrc="/paper-plane.png"
								description="Automated transaction submission to destination Messenger contract"
							/>
						</div>
					</div>
				</Card.Body>
			</Card.Root>

			<ConfigWarningBanner />

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
						<Field.Root invalid={!!errors.sourceChain}>
							<Controller
								name="sourceChain"
								control={control}
								render={({ field }) => (
									<Select.Root
										collection={chainsCollection}
										value={field.value}
										onValueChange={(e) => field.onChange(e.value)}
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
								)}
							/>
							{errors.sourceChain && (
								<Field.ErrorText>{errors.sourceChain.message}</Field.ErrorText>
							)}
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

						<Field.Root invalid={!!errors.destChain}>
							<Controller
								name="destChain"
								control={control}
								render={({ field }) => (
									<Select.Root
										collection={destChainsCollection}
										value={field.value}
										onValueChange={(e) => field.onChange(e.value)}
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
								)}
							/>
							{errors.destChain && (
								<Field.ErrorText>{errors.destChain.message}</Field.ErrorText>
							)}
						</Field.Root>
					</div>

					<Field.Root invalid={!!errors.amount}>
						<Controller
							name="amount"
							control={control}
							rules={{
								validate: {
									minimum: (val) =>
										Number(val) >= MINIMUM_AMOUNT ||
										`Minimum amount is ${MINIMUM_AMOUNT} USDC`,
									balance: (val) => {
										if (sourceBalance === undefined) return true;
										return (
											parseUnits(val, 6) <= sourceBalance ||
											"Insufficient balance"
										);
									},
								},
							}}
							render={({ field }) => (
								<NumberInput.Root
									value={field.value}
									onValueChange={(e) =>
										field.onChange(
											Number.isNaN(e.valueAsNumber)
												? "0"
												: e.valueAsNumber.toString(),
										)
									}
									min={0}
									step={0.01}
									formatOptions={{ style: "decimal", minimumFractionDigits: 2 }}
									disabled={!isConnected}
								>
									<NumberInput.Label>Amount (USDC)</NumberInput.Label>
									<NumberInput.Input />
								</NumberInput.Root>
							)}
						/>
						{errors.amount && (
							<Field.ErrorText>{errors.amount.message}</Field.ErrorText>
						)}
					</Field.Root>

					<div
						className={css({
							display: "flex",
							flexDirection: "column",
							gap: "3",
							p: "4",
							bg: "gray.subtle.bg",
							borderRadius: "lg",
							border: "1px solid",
							borderColor: "border",
						})}
					>
						<div
							className={css({
								display: "flex",
								alignItems: "center",
								gap: "2",
							})}
						>
							<User
								className={css({
									width: "4",
									height: "4",
									color: "blue.11",
								})}
							/>
							<Text className={css({ fontWeight: "medium" })}>
								Bridge Destination
							</Text>
						</div>

						<label
							className={css({
								display: "flex",
								alignItems: "center",
								gap: "2",
								cursor: "pointer",
							})}
						>
							<input
								type="checkbox"
								checked={sameAsWallet}
								onChange={handleToggleSameAsWallet}
								className={css({
									width: "5",
									height: "5",
									accentColor: "teal",
									cursor: "pointer",
								})}
							/>
							<Text
								className={css({
									fontSize: "sm",
									color: "fg.default",
									userSelect: "none",
								})}
							>
								Send to connected wallet
							</Text>
						</label>

						<Field.Root
							invalid={
								!sameAsWallet &&
								recipientAddress.length > 0 &&
								!isAddress(recipientAddress)
							}
						>
							<Field.Label
								className={css({
									fontSize: "sm",
									color: "fg.muted",
								})}
							>
								Recipient Address
							</Field.Label>
							<Input
								value={recipientAddress}
								onChange={(e) => setRecipientAddress(e.target.value)}
								placeholder={
									sameAsWallet ? (address ?? "Connect wallet") : "0x..."
								}
								disabled={sameAsWallet || !isConnected}
								className={css({
									fontFamily: "mono",
									fontSize: "sm",
								})}
							/>
							{!sameAsWallet &&
								recipientAddress.length > 0 &&
								!isAddress(recipientAddress) && (
									<Field.ErrorText>Invalid Ethereum address</Field.ErrorText>
								)}
						</Field.Root>
					</div>

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
							!!errors.amount ||
							Number(amount) < MINIMUM_AMOUNT ||
							!isApproved ||
							isBurning ||
							isBurnConfirming ||
							(!sameAsWallet && !isAddress(recipientAddress))
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

function StepCard({
	title,
	imageSrc,
	description,
}: {
	title: string;
	imageSrc: string;
	description: string;
}) {
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
				alignItems: "center",
				textAlign: "center",
				overflow: "hidden",
			})}
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
