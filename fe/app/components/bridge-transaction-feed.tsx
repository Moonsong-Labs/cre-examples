import {
	ArrowRight,
	ExternalLink,
	Flame,
	Loader2,
	RefreshCw,
	Sparkles,
} from "lucide-react";
import { css } from "styled-system/css";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { BLOCK_EXPLORER_URLS, type BridgeEvent } from "~/config/cctp";
import {
	formatBridgeAmount,
	getDomainChainName,
	useBridgeEvents,
} from "~/hooks/useBridgeEvents";
import { Badge, Button, Card, Text } from "./ui";

function formatTimeAgo(timestamp: number): string {
	const now = Math.floor(Date.now() / 1000);
	const diff = now - timestamp;

	if (diff < 60) return "just now";
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	return `${Math.floor(diff / 86400)}d ago`;
}

function truncateHash(hash: string): string {
	return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function BridgeEventRow({ event }: { event: BridgeEvent }) {
	const explorerUrl = BLOCK_EXPLORER_URLS[event.chainId];
	const txUrl = explorerUrl ? `${explorerUrl}/tx/${event.txHash}` : null;

	return (
		<div
			className={css({
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "4",
				p: "3",
				bg: "gray.surface.bg",
				borderRadius: "md",
				border: "1px solid",
				borderColor: "border",
				transition: "all 0.2s",
				_hover: { bg: "gray.subtle.bg" },
			})}
		>
			<div
				className={css({
					display: "flex",
					alignItems: "center",
					gap: "3",
					flex: "1",
					minWidth: "0",
				})}
			>
				<div
					className={css({
						p: "2",
						borderRadius: "full",
						bg: event.type === "burn" ? "amber.3" : "green.3",
						color: event.type === "burn" ? "amber.11" : "green.11",
						flexShrink: "0",
					})}
				>
					{event.type === "burn" ? (
						<Flame className={css({ width: "4", height: "4" })} />
					) : (
						<Sparkles className={css({ width: "4", height: "4" })} />
					)}
				</div>

				<div
					className={css({
						display: "flex",
						flexDirection: "column",
						gap: "0.5",
						minWidth: "0",
					})}
				>
					<div
						className={css({
							display: "flex",
							alignItems: "center",
							gap: "2",
							flexWrap: "wrap",
						})}
					>
						<Text className={css({ fontWeight: "semibold", fontSize: "sm" })}>
							{formatBridgeAmount(event.amount)} USDC
						</Text>
						<Badge
							variant="outline"
							colorPalette={event.type === "burn" ? "amber" : "green"}
							size="sm"
						>
							{event.type === "burn" ? "Burn" : "Mint"}
						</Badge>
					</div>

					<div
						className={css({
							display: "flex",
							alignItems: "center",
							gap: "1.5",
							fontSize: "xs",
							color: "fg.muted",
						})}
					>
						<Text>{getDomainChainName(event.sourceDomain)}</Text>
						<ArrowRight className={css({ width: "3", height: "3" })} />
						<Text>{getDomainChainName(event.destinationDomain)}</Text>
					</div>
				</div>
			</div>

			<div
				className={css({
					display: "flex",
					alignItems: "center",
					gap: "3",
					flexShrink: "0",
				})}
			>
				<Text
					className={css({
						fontSize: "xs",
						color: "fg.subtle",
						display: { base: "none", sm: "block" },
					})}
				>
					{formatTimeAgo(event.timestamp)}
				</Text>

				{txUrl && (
					<a
						href={txUrl}
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
						{truncateHash(event.txHash)}
						<ExternalLink className={css({ width: "3", height: "3" })} />
					</a>
				)}
			</div>
		</div>
	);
}

export function BridgeTransactionFeed() {
	const { address, isConnected } = useAccount();
	const { events, isLoading, error, refetch } = useBridgeEvents(
		address as Address | undefined,
	);

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
						Live Bridge Activity
					</Card.Title>
					<Card.Description>
						Real-time CCTP bridge transactions for your wallet
					</Card.Description>
				</Card.Header>
				<Card.Body>
					<div
						className={css({
							textAlign: "center",
							py: "8",
							color: "fg.muted",
						})}
					>
						Connect your wallet to see your bridge activity
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
							Live Bridge Activity
							{isLoading && (
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
							Real-time CCTP bridge transactions for your wallet
						</Card.Description>
					</div>
					<Button
						variant="subtle"
						size="sm"
						onClick={refetch}
						disabled={isLoading}
						className={css({ flexShrink: "0" })}
					>
						<RefreshCw
							className={css({
								width: "4",
								height: "4",
								animation: isLoading ? "spin" : "none",
							})}
						/>
					</Button>
				</div>
			</Card.Header>
			<Card.Body>
				{error && (
					<div
						className={css({
							p: "3",
							mb: "4",
							bg: "red.2",
							border: "1px solid",
							borderColor: "red.6",
							borderRadius: "md",
							color: "red.11",
							fontSize: "sm",
						})}
					>
						{error}
					</div>
				)}

				{events.length === 0 && !isLoading ? (
					<div
						className={css({
							textAlign: "center",
							py: "8",
							color: "fg.muted",
						})}
					>
						No bridge transactions found
					</div>
				) : (
					<div
						className={css({
							display: "flex",
							flexDirection: "column",
							gap: "2",
							maxHeight: "400px",
							overflowY: "auto",
						})}
					>
						{events.map((event) => (
							<BridgeEventRow key={event.id} event={event} />
						))}
					</div>
				)}

				<div
					className={css({
						mt: "4",
						pt: "3",
						borderTop: "1px solid",
						borderColor: "border",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						fontSize: "xs",
						color: "fg.subtle",
					})}
				>
					<div
						className={css({ display: "flex", alignItems: "center", gap: "2" })}
					>
						<div
							className={css({
								width: "2",
								height: "2",
								borderRadius: "full",
								bg: "green.9",
								animation: "pulse",
							})}
						/>
						Listening for new events
					</div>
					<Text>{events.length} transactions</Text>
				</div>
			</Card.Body>
		</Card.Root>
	);
}
