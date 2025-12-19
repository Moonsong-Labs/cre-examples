import { useQuery } from "@tanstack/react-query";

export interface UseSpreadsheetDataResult {
	addresses: string[];
	loading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
}

async function fetchSpreadsheetData(): Promise<string[]> {
	const serverUrl =
		import.meta.env.VITE_CRE_HELPER_SERVER_URL || "http://localhost:3000";
	const apiKey = import.meta.env.VITE_CRE_HELPER_API_KEY;

	if (!apiKey) {
		throw new Error("Missing API key (VITE_CRE_HELPER_API_KEY)");
	}

	const response = await fetch(`${serverUrl}/02-compliance/allowlist`, {
		headers: { "X-API-Key": apiKey },
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch allowlist (HTTP ${response.status})`);
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
 * Automatically refetches every 30 seconds.
 */
export function useSpreadsheetData(): UseSpreadsheetDataResult {
	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ["spreadsheet-allowlist"],
		queryFn: fetchSpreadsheetData,
		refetchInterval: 30_000,
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
