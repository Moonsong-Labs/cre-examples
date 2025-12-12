import { useCallback, useEffect, useRef, useState } from "react";
import {
	type Address,
	decodeEventLog,
	encodeEventTopics,
	formatUnits,
	padHex,
} from "viem";
import { useWatchContractEvent } from "wagmi";
import { arbitrumSepolia, baseSepolia, sepolia } from "wagmi/chains";
import {
	type BridgeEvent,
	CCTP_DOMAINS,
	CHAIN_NAMES,
	depositForBurnEventAbi,
	DOMAIN_TO_CHAIN_ID,
	ETHERSCAN_API_URLS,
	messageReceivedEventAbi,
	MESSAGE_TRANSMITTER_V2_ADDRESS,
	TOKEN_MESSENGER_V2_ADDRESS,
} from "~/config/cctp";

const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY ?? "";
const SUPPORTED_CHAINS = [sepolia, baseSepolia, arbitrumSepolia];
const MAX_EVENTS_PER_CHAIN = 10;

interface EtherscanLogResult {
	address: string;
	topics: string[];
	data: string;
	blockNumber: string;
	timeStamp: string;
	transactionHash: string;
}

async function fetchHistoricalLogs(
	chainId: number,
	address: Address,
	topic0: `0x${string}`,
	topic2: `0x${string}` | null,
): Promise<EtherscanLogResult[]> {
	const baseUrl = ETHERSCAN_API_URLS[chainId];
	if (!baseUrl || !ETHERSCAN_API_KEY) {
		return [];
	}

	const params = new URLSearchParams({
		chainid: chainId.toString(),
		module: "logs",
		action: "getLogs",
		address,
		fromBlock: "0",
		toBlock: "latest",
		topic0,
		page: "1",
		offset: "50",
		apikey: ETHERSCAN_API_KEY,
	});

	if (topic2) {
		params.set("topic2", topic2);
		params.set("topic0_2_opr", "and");
	}

	const url = `${baseUrl}?${params.toString()}`;
	const response = await fetch(url);
	const json = await response.json();

	if (json.status !== "1" || !Array.isArray(json.result)) {
		return [];
	}

	return json.result;
}

function parseDepositForBurnLog(
	log: EtherscanLogResult,
	chainId: number,
): BridgeEvent | null {
	try {
		const decoded = decodeEventLog({
			abi: depositForBurnEventAbi,
			data: log.data as `0x${string}`,
			topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
		});

		const args = decoded.args as {
			burnToken: Address;
			amount: bigint;
			depositor: Address;
			mintRecipient: `0x${string}`;
			destinationDomain: number;
			destinationTokenMessenger: `0x${string}`;
			destinationCaller: `0x${string}`;
			maxFee: bigint;
			minFinalityThreshold: number;
			hookData: `0x${string}`;
		};

		return {
			id: `burn-${log.transactionHash}-${log.topics[0]}`,
			type: "burn",
			chainId,
			txHash: log.transactionHash as `0x${string}`,
			blockNumber: BigInt(log.blockNumber),
			timestamp: Number.parseInt(log.timeStamp, 16),
			depositor: args.depositor,
			amount: args.amount,
			sourceDomain: CCTP_DOMAINS[chainId] ?? 0,
			destinationDomain: args.destinationDomain,
		};
	} catch {
		return null;
	}
}

function parseMessageReceivedLog(
	log: EtherscanLogResult,
	chainId: number,
): Partial<BridgeEvent> | null {
	try {
		const decoded = decodeEventLog({
			abi: messageReceivedEventAbi,
			data: log.data as `0x${string}`,
			topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
		});

		const args = decoded.args as {
			caller: Address;
			sourceDomain: number;
			nonce: `0x${string}`;
			sender: `0x${string}`;
			messageBody: `0x${string}`;
		};

		return {
			id: `mint-${log.transactionHash}-${args.nonce}`,
			type: "mint",
			chainId,
			txHash: log.transactionHash as `0x${string}`,
			blockNumber: BigInt(log.blockNumber),
			timestamp: Number.parseInt(log.timeStamp, 16),
			sourceDomain: args.sourceDomain,
			destinationDomain: CCTP_DOMAINS[chainId] ?? 0,
		};
	} catch {
		return null;
	}
}

export function useBridgeEvents(walletAddress: Address | undefined) {
	const [events, setEvents] = useState<BridgeEvent[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const initialFetchDone = useRef(false);

	const addEvent = useCallback((event: BridgeEvent) => {
		setEvents((prev) => {
			if (prev.some((e) => e.id === event.id)) return prev;
			return [event, ...prev].sort((a, b) => b.timestamp - a.timestamp);
		});
	}, []);

	const fetchHistorical = useCallback(async () => {
		if (!walletAddress || !ETHERSCAN_API_KEY) return;

		setIsLoading(true);
		setError(null);

		try {
			const depositTopic0 = encodeEventTopics({
				abi: depositForBurnEventAbi,
				eventName: "DepositForBurn",
			})[0];

			const walletTopic = padHex(walletAddress.toLowerCase() as `0x${string}`, {
				size: 32,
			});

			const allEvents: BridgeEvent[] = [];

			for (const chain of SUPPORTED_CHAINS) {
				const burnLogs = await fetchHistoricalLogs(
					chain.id,
					TOKEN_MESSENGER_V2_ADDRESS,
					depositTopic0,
					walletTopic,
				);

				const chainEvents: BridgeEvent[] = [];
				for (const log of burnLogs) {
					const parsed = parseDepositForBurnLog(log, chain.id);
					if (
						parsed &&
						parsed.depositor.toLowerCase() === walletAddress.toLowerCase()
					) {
						chainEvents.push(parsed);
					}
				}

				chainEvents.sort((a, b) => b.timestamp - a.timestamp);
				allEvents.push(...chainEvents.slice(0, MAX_EVENTS_PER_CHAIN));
			}

			const sorted = allEvents
				.sort((a, b) => b.timestamp - a.timestamp)
				.slice(0, MAX_EVENTS_PER_CHAIN);
			setEvents(sorted);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to fetch events");
		} finally {
			setIsLoading(false);
		}
	}, [walletAddress]);

	useEffect(() => {
		if (walletAddress && !initialFetchDone.current) {
			initialFetchDone.current = true;
			fetchHistorical();
		}
	}, [walletAddress, fetchHistorical]);

	useEffect(() => {
		if (!walletAddress) {
			initialFetchDone.current = false;
			setEvents([]);
		}
	}, [walletAddress]);

	useWatchContractEvent({
		address: TOKEN_MESSENGER_V2_ADDRESS,
		abi: depositForBurnEventAbi,
		eventName: "DepositForBurn",
		chainId: sepolia.id,
		args: { depositor: walletAddress },
		enabled: !!walletAddress,
		onLogs: (logs) => {
			for (const log of logs) {
				const event: BridgeEvent = {
					id: `burn-${log.transactionHash}-${log.logIndex}`,
					type: "burn",
					chainId: sepolia.id,
					txHash: log.transactionHash,
					blockNumber: log.blockNumber,
					timestamp: Math.floor(Date.now() / 1000),
					depositor: log.args.depositor as Address,
					amount: log.args.amount as bigint,
					sourceDomain: CCTP_DOMAINS[sepolia.id] ?? 0,
					destinationDomain: log.args.destinationDomain as number,
				};
				addEvent(event);
			}
		},
	});

	useWatchContractEvent({
		address: TOKEN_MESSENGER_V2_ADDRESS,
		abi: depositForBurnEventAbi,
		eventName: "DepositForBurn",
		chainId: baseSepolia.id,
		args: { depositor: walletAddress },
		enabled: !!walletAddress,
		onLogs: (logs) => {
			for (const log of logs) {
				const event: BridgeEvent = {
					id: `burn-${log.transactionHash}-${log.logIndex}`,
					type: "burn",
					chainId: baseSepolia.id,
					txHash: log.transactionHash,
					blockNumber: log.blockNumber,
					timestamp: Math.floor(Date.now() / 1000),
					depositor: log.args.depositor as Address,
					amount: log.args.amount as bigint,
					sourceDomain: CCTP_DOMAINS[baseSepolia.id] ?? 0,
					destinationDomain: log.args.destinationDomain as number,
				};
				addEvent(event);
			}
		},
	});

	useWatchContractEvent({
		address: TOKEN_MESSENGER_V2_ADDRESS,
		abi: depositForBurnEventAbi,
		eventName: "DepositForBurn",
		chainId: arbitrumSepolia.id,
		args: { depositor: walletAddress },
		enabled: !!walletAddress,
		onLogs: (logs) => {
			for (const log of logs) {
				const event: BridgeEvent = {
					id: `burn-${log.transactionHash}-${log.logIndex}`,
					type: "burn",
					chainId: arbitrumSepolia.id,
					txHash: log.transactionHash,
					blockNumber: log.blockNumber,
					timestamp: Math.floor(Date.now() / 1000),
					depositor: log.args.depositor as Address,
					amount: log.args.amount as bigint,
					sourceDomain: CCTP_DOMAINS[arbitrumSepolia.id] ?? 0,
					destinationDomain: log.args.destinationDomain as number,
				};
				addEvent(event);
			}
		},
	});

	return {
		events,
		isLoading,
		error,
		refetch: fetchHistorical,
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
