import { useQuery } from "@tanstack/react-query";

export interface UseSpreadsheetDataResult {
	addresses: string[];
	loading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
}

async function fetchSpreadsheetData(): Promise<string[]> {
	const response = await fetch("/be/allowlist");

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(
			errorData.error || `Failed to fetch allowlist (HTTP ${response.status})`,
		);
	}

	const result = (await response.json()) as {
		addresses?: string[];
		count?: number;
		error?: string;
	};

	return result.addresses || [];
}

/**
 * Fetches spreadsheet allowlist data from the CRE helper server.
 * Automatically refetches every 5 seconds.
 */
export function useSpreadsheetData(): UseSpreadsheetDataResult {
	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ["spreadsheet-allowlist"],
		queryFn: fetchSpreadsheetData,
		refetchInterval: 5_000,
		staleTime: 10_000,
	});

	return {
		addresses: data ?? [],
		loading: isLoading,
		error: error instanceof Error ? error.message : null,
		refetch: async () => {
			await refetch();
		},
	};
}
