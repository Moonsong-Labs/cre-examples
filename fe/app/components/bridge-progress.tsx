import {
	AlertCircle,
	ArrowRight,
	Check,
	ExternalLink,
	Flame,
	Loader2,
	Radio,
	Shield,
	Sparkles,
} from "lucide-react";
import { css, cx } from "styled-system/css";
import { useAccount } from "wagmi";
import { BLOCK_EXPLORER_URLS } from "~/config/cctp";
import {
	type BridgeTransfer,
	formatBridgeAmount,
	getChainName,
} from "~/hooks/useBridgeEvents";
import { Badge, Card, Text } from "./ui";

const stepIndicator = css({
	position: "relative",
	display: "flex",
	height: "10",
	width: "10",
	alignItems: "center",
	justifyContent: "center",
	borderRadius: "full",
	fontWeight: "semibold",
	fontSize: "sm",
	transition: "all 0.3s ease",
});

const stepConnector = css({
	position: "relative",
	mx: "2",
	height: "0.5",
	flex: "1",
	overflow: "hidden",
	borderRadius: "sm",
	bg: "gray.7",
});

const stepConnectorFill = css({
	position: "absolute",
	left: "0",
	top: "0",
	height: "100%",
	bg: "teal.9",
	transition: "width 0.5s ease",
});

const stepLabel = css({
	fontSize: "xs",
	color: "fg.muted",
	mt: "2",
	textAlign: "center",
	transition: "color 0.3s ease",
});

const pulseAnimation = css({
	animation: "pulse 2s infinite",
});

interface StepProps {
	step: number;
	currentStep: number;
	label: string;
	icon: React.ReactNode;
	activeIcon?: React.ReactNode;
}

function Step({ step, currentStep, label, icon, activeIcon }: StepProps) {
	const isCompleted = currentStep > step;
	const isActive = currentStep === step;

	return (
		<div
			className={css({
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
			})}
		>
			<div
				className={cx(
					stepIndicator,
					css({
						bg: isCompleted ? "teal.9" : isActive ? "teal.4" : "gray.4",
						color: isCompleted ? "white" : isActive ? "teal.11" : "fg.muted",
						border: isActive ? "2px solid" : "none",
						borderColor: isActive ? "teal.9" : "transparent",
					}),
					isActive && pulseAnimation,
				)}
			>
				{isCompleted ? (
					<Check className={css({ width: "5", height: "5" })} />
				) : isActive && activeIcon ? (
					activeIcon
				) : (
					icon
				)}
			</div>
			<Text
				className={cx(
					stepLabel,
					css({
						color: isCompleted || isActive ? "fg.default" : "fg.muted",
						fontWeight: isActive ? "medium" : "normal",
					}),
				)}
			>
				{label}
			</Text>
		</div>
	);
}

interface StepConnectorProps {
	isCompleted: boolean;
}

function StepConnectorLine({ isCompleted }: StepConnectorProps) {
	return (
		<div className={stepConnector}>
			<div
				className={stepConnectorFill}
				style={{ width: isCompleted ? "100%" : "0%" }}
			/>
		</div>
	);
}

function truncateHash(hash: string): string {
	return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

interface TransferDetailsProps {
	transfer: BridgeTransfer;
}

function TransferDetails({ transfer }: TransferDetailsProps) {
	const sourceExplorer = BLOCK_EXPLORER_URLS[transfer.sourceChainId];
	const destExplorer = BLOCK_EXPLORER_URLS[transfer.destChainId];

	return (
		<div
			className={css({
				mt: "6",
				p: "4",
				bg: "gray.subtle.bg",
				borderRadius: "lg",
				border: "1px solid",
				borderColor: "border",
			})}
		>
			<div
				className={css({ display: "flex", flexDirection: "column", gap: "3" })}
			>
				<div
					className={css({
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					})}
				>
					<Text className={css({ fontSize: "sm", color: "fg.muted" })}>
						Amount
					</Text>
					<Text className={css({ fontWeight: "semibold" })}>
						{formatBridgeAmount(transfer.amount)} USDC
					</Text>
				</div>

				<div
					className={css({
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					})}
				>
					<Text className={css({ fontSize: "sm", color: "fg.muted" })}>
						Route
					</Text>
					<div
						className={css({ display: "flex", alignItems: "center", gap: "2" })}
					>
						<Badge variant="outline" size="sm">
							{getChainName(transfer.sourceChainId)}
						</Badge>
						<ArrowRight
							className={css({ width: "3", height: "3", color: "fg.muted" })}
						/>
						<Badge variant="outline" size="sm">
							{getChainName(transfer.destChainId)}
						</Badge>
					</div>
				</div>

				{transfer.depositTxHash && transfer.depositTxHash !== "0x" && (
					<div
						className={css({
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
						})}
					>
						<Text className={css({ fontSize: "sm", color: "fg.muted" })}>
							Deposit Tx
						</Text>
						{sourceExplorer ? (
							<a
								href={`${sourceExplorer}/tx/${transfer.depositTxHash}`}
								target="_blank"
								rel="noopener noreferrer"
								className={css({
									display: "flex",
									alignItems: "center",
									gap: "1",
									fontSize: "sm",
									color: "teal.11",
									_hover: { textDecoration: "underline" },
								})}
							>
								{truncateHash(transfer.depositTxHash)}
								<ExternalLink className={css({ width: "3", height: "3" })} />
							</a>
						) : (
							<Text className={css({ fontSize: "sm" })}>
								{truncateHash(transfer.depositTxHash)}
							</Text>
						)}
					</div>
				)}

				{transfer.mintTxHash && (
					<div
						className={css({
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
						})}
					>
						<Text className={css({ fontSize: "sm", color: "fg.muted" })}>
							Mint Tx
						</Text>
						{destExplorer ? (
							<a
								href={`${destExplorer}/tx/${transfer.mintTxHash}`}
								target="_blank"
								rel="noopener noreferrer"
								className={css({
									display: "flex",
									alignItems: "center",
									gap: "1",
									fontSize: "sm",
									color: "teal.11",
									_hover: { textDecoration: "underline" },
								})}
							>
								{truncateHash(transfer.mintTxHash)}
								<ExternalLink className={css({ width: "3", height: "3" })} />
							</a>
						) : (
							<Text className={css({ fontSize: "sm" })}>
								{truncateHash(transfer.mintTxHash)}
							</Text>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

interface BridgeProgressProps {
	transfer: BridgeTransfer | null;
	onReset: () => void;
}

const statusToStep: Record<string, number> = {
	pending: 1,
	deposited: 3, // deposit confirmed → step 2 done, now on step 3 (attesting)
	attesting: 3,
	relaying: 4,
	minted: 6, // all steps completed
	failed: 6,
};

export function BridgeProgress({ transfer, onReset }: BridgeProgressProps) {
	const { isConnected } = useAccount();

	const currentStep = transfer ? (statusToStep[transfer.status] ?? 0) : 0;

	if (!isConnected) {
		return (
			<Card.Root variant="outline">
				<Card.Header>
					<Card.Title
						className={css({ display: "flex", alignItems: "center", gap: "2" })}
					>
						<Sparkles
							className={css({ width: "5", height: "5", color: "teal.11" })}
						/>
						Bridge Progress
					</Card.Title>
					<Card.Description>
						Track your cross-chain transfer in real-time
					</Card.Description>
				</Card.Header>
				<Card.Body>
					<div
						className={css({ textAlign: "center", py: "8", color: "fg.muted" })}
					>
						Connect your wallet to track bridge transfers
					</div>
				</Card.Body>
			</Card.Root>
		);
	}

	if (!transfer) {
		return (
			<Card.Root variant="outline">
				<Card.Header>
					<Card.Title
						className={css({ display: "flex", alignItems: "center", gap: "2" })}
					>
						<Sparkles
							className={css({ width: "5", height: "5", color: "teal.11" })}
						/>
						Bridge Progress
					</Card.Title>
					<Card.Description>
						Track your cross-chain transfer in real-time
					</Card.Description>
				</Card.Header>
				<Card.Body>
					<div
						className={css({ textAlign: "center", py: "8", color: "fg.muted" })}
					>
						Initiate a transfer to see progress here
					</div>
				</Card.Body>
			</Card.Root>
		);
	}

	return (
		<Card.Root variant="outline">
			<Card.Header>
				<div
					className={css({
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					})}
				>
					<div>
						<Card.Title
							className={css({
								display: "flex",
								alignItems: "center",
								gap: "2",
							})}
						>
							<Sparkles
								className={css({ width: "5", height: "5", color: "teal.11" })}
							/>
							Bridge Progress
							{transfer.status !== "minted" && transfer.status !== "failed" && (
								<Loader2
									className={css({
										width: "4",
										height: "4",
										animation: "spin",
										color: "fg.muted",
									})}
								/>
							)}
						</Card.Title>
						<Card.Description>
							Track your cross-chain transfer in real-time
						</Card.Description>
					</div>
					{transfer.status === "minted" && (
						<Badge variant="solid" colorPalette="green">
							Complete
						</Badge>
					)}
					{transfer.status === "failed" && (
						<Badge variant="solid" colorPalette="red">
							Failed
						</Badge>
					)}
				</div>
			</Card.Header>
			<Card.Body>
				<div
					className={css({
						display: "flex",
						alignItems: "flex-start",
						justifyContent: "center",
						pt: "4",
						pb: "2",
					})}
				>
					<Step
						step={1}
						currentStep={currentStep}
						label="Pending"
						icon={<Loader2 className={css({ width: "5", height: "5" })} />}
						activeIcon={
							<Loader2
								className={css({ width: "5", height: "5", animation: "spin" })}
							/>
						}
					/>
					<StepConnectorLine isCompleted={currentStep > 1} />
					<Step
						step={2}
						currentStep={currentStep}
						label="Deposited"
						icon={<Flame className={css({ width: "5", height: "5" })} />}
						activeIcon={<Flame className={css({ width: "5", height: "5" })} />}
					/>
					<StepConnectorLine isCompleted={currentStep > 2} />
					<Step
						step={3}
						currentStep={currentStep}
						label="Attesting"
						icon={<Shield className={css({ width: "5", height: "5" })} />}
						activeIcon={<Shield className={css({ width: "5", height: "5" })} />}
					/>
					<StepConnectorLine isCompleted={currentStep > 3} />
					<Step
						step={4}
						currentStep={currentStep}
						label="Relaying"
						icon={<Radio className={css({ width: "5", height: "5" })} />}
						activeIcon={<Radio className={css({ width: "5", height: "5" })} />}
					/>
					<StepConnectorLine isCompleted={currentStep > 4} />
					<Step
						step={5}
						currentStep={currentStep}
						label={transfer.status === "failed" ? "Failed" : "Minted"}
						icon={
							transfer.status === "failed" ? (
								<AlertCircle className={css({ width: "5", height: "5" })} />
							) : (
								<Sparkles className={css({ width: "5", height: "5" })} />
							)
						}
						activeIcon={
							transfer.status === "failed" ? (
								<AlertCircle className={css({ width: "5", height: "5" })} />
							) : (
								<Sparkles className={css({ width: "5", height: "5" })} />
							)
						}
					/>
				</div>

				{transfer.status !== "pending" && (
					<TransferDetails transfer={transfer} />
				)}

				{(transfer.status === "minted" || transfer.status === "failed") && (
					<div className={css({ mt: "4", textAlign: "center" })}>
						<button
							type="button"
							onClick={onReset}
							className={css({
								fontSize: "sm",
								color: "teal.11",
								cursor: "pointer",
								_hover: { textDecoration: "underline" },
							})}
						>
							Start new transfer
						</button>
					</div>
				)}
			</Card.Body>
			<Card.Footer>
				<div
					className={css({
						display: "flex",
						alignItems: "center",
						gap: "2",
						fontSize: "xs",
						color: "fg.subtle",
					})}
				>
					<div
						className={css({
							width: "2",
							height: "2",
							borderRadius: "full",
							bg:
								transfer.status === "minted"
									? "green.9"
									: transfer.status === "failed"
										? "red.9"
										: "amber.9",
							animation:
								transfer.status !== "minted" && transfer.status !== "failed"
									? "pulse"
									: "none",
						})}
					/>
					{transfer.status === "pending" &&
						"Waiting for deposit transaction..."}
					{transfer.status === "deposited" &&
						"Deposit confirmed, processing..."}
					{transfer.status === "attesting" &&
						"Fetching attestation from Circle..."}
					{transfer.status === "relaying" && "Relaying to destination chain..."}
					{transfer.status === "minted" && "Transfer complete!"}
					{transfer.status === "failed" &&
						(transfer.errorMessage ?? "Transfer failed")}
				</div>
			</Card.Footer>
		</Card.Root>
	);
}
