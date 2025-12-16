import { useCallback, useState } from "react";
import { type Address, formatUnits } from "viem";
import { useWatchContractEvent } from "wagmi";
import {
	CCTP_DOMAINS,
	CHAIN_NAMES,
	DOMAIN_TO_CHAIN_ID,
	depositForBurnEventAbi,
	MESSAGE_TRANSMITTER_V2_ADDRESS,
	messageReceivedEventAbi,
	RECEIVER_ADDRESSES,
	TOKEN_MESSENGER_V2_ADDRESS,
} from "~/config/cctp";

export type TransferStatus = "pending" | "deposit_sent" | "minted";

export interface BridgeTransfer {
	id: string;
	status: TransferStatus;
	sourceChainId: number;
	destChainId: number;
	sourceDomain: number;
	destinationDomain: number;
	amount: bigint;
	depositor: Address;
	depositTxHash: `0x${string}`;
	mintTxHash?: `0x${string}`;
	depositTimestamp: number;
	mintTimestamp?: number;
}

type SupportedChainId = 11155111 | 84532 | 421614;

interface UseBridgeTransferParams {
	walletAddress: Address | undefined;
	sourceChainId: SupportedChainId | undefined;
	destChainId: SupportedChainId | undefined;
}

export function useBridgeTransfer({
	walletAddress,
	sourceChainId,
	destChainId,
}: UseBridgeTransferParams) {
	const [transfer, setTransfer] = useState<BridgeTransfer | null>(null);

	const handleDepositForBurn = useCallback(
		(
			chainId: number,
			txHash: `0x${string}`,
			depositor: Address,
			amount: bigint,
			destinationDomain: number,
		) => {
			const sourceDomain = CCTP_DOMAINS[chainId] ?? 0;
			const destChainId = DOMAIN_TO_CHAIN_ID[destinationDomain];

			setTransfer({
				id: `transfer-${txHash}`,
				status: "deposit_sent",
				sourceChainId: chainId,
				destChainId: destChainId ?? 0,
				sourceDomain,
				destinationDomain,
				amount,
				depositor,
				depositTxHash: txHash,
				depositTimestamp: Math.floor(Date.now() / 1000),
			});
		},
		[],
	);

	const handleMessageReceived = useCallback(
		(chainId: number, txHash: `0x${string}`, sourceDomain: number) => {
			setTransfer((prev) => {
				if (!prev) return prev;
				if (prev.sourceDomain !== sourceDomain) return prev;
				if (DOMAIN_TO_CHAIN_ID[prev.destinationDomain] !== chainId) return prev;

				return {
					...prev,
					status: "minted",
					mintTxHash: txHash,
					mintTimestamp: Math.floor(Date.now() / 1000),
				};
			});
		},
		[],
	);

	useWatchContractEvent({
		address: TOKEN_MESSENGER_V2_ADDRESS,
		abi: depositForBurnEventAbi,
		eventName: "DepositForBurn",
		chainId: sourceChainId,
		args: { depositor: walletAddress },
		enabled: !!walletAddress && !!sourceChainId,
		onLogs: (logs) => {
			for (const log of logs) {
				if (!sourceChainId) continue;
				handleDepositForBurn(
					sourceChainId,
					log.transactionHash,
					log.args.depositor as Address,
					log.args.amount as bigint,
					log.args.destinationDomain as number,
				);
			}
		},
	});

	const destReceiverAddress = destChainId
		? RECEIVER_ADDRESSES[destChainId]
		: undefined;

	useWatchContractEvent({
		address: MESSAGE_TRANSMITTER_V2_ADDRESS,
		abi: messageReceivedEventAbi,
		eventName: "MessageReceived",
		chainId: destChainId,
		args: { caller: destReceiverAddress },
		enabled:
			!!walletAddress && !!destChainId && !!destReceiverAddress && !!transfer,
		onLogs: (logs) => {
			for (const log of logs) {
				if (!destChainId) continue;
				handleMessageReceived(
					destChainId,
					log.transactionHash,
					log.args.sourceDomain as number,
				);
			}
		},
	});

	const reset = useCallback(() => {
		setTransfer(null);
	}, []);

	const startPending = useCallback(() => {
		setTransfer((prev) => {
			if (prev) return prev;
			return {
				id: `pending-${Date.now()}`,
				status: "pending",
				sourceChainId: 0,
				destChainId: 0,
				sourceDomain: 0,
				destinationDomain: 0,
				amount: 0n,
				depositor: "0x" as Address,
				depositTxHash: "0x" as `0x${string}`,
				depositTimestamp: Math.floor(Date.now() / 1000),
			};
		});
	}, []);

	return {
		transfer,
		reset,
		startPending,
	};
}

export function formatBridgeAmount(amount: bigint): string {
	return Number(formatUnits(amount, 6)).toFixed(2);
}

export function getChainName(chainId: number): string {
	return CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;
}

export function getDomainChainName(domain: number): string {
	const chainId = DOMAIN_TO_CHAIN_ID[domain];
	return chainId ? getChainName(chainId) : `Domain ${domain}`;
}
