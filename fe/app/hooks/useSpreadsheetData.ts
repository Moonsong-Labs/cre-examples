import { useEffect, useState } from "react";

export interface UseSpreadsheetDataResult {
	addresses: string[];
	loading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
}

/**
 * Fetches spreadsheet allowlist data from the CRE helper server.
 * Automatically refetches every 30 seconds.
 */
export function useSpreadsheetData(): UseSpreadsheetDataResult {
	const [addresses, setAddresses] = useState<string[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchData = async () => {
		try {
			setLoading(true);
			setError(null);

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

			setAddresses(result.addresses || []);
			setError(null);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to fetch spreadsheet data";
			console.error(message, err);
			setError(message);
			setAddresses([]);
		} finally {
			setLoading(false);
		}
	};

	// Set up periodic refresh
	useEffect(() => {
		void fetchData();
		const interval = setInterval(() => {
			void fetchData();
		}, 30000); // Refresh every 30 seconds

		return () => clearInterval(interval);
	}, [fetchData]);

	return {
		addresses,
		loading,
		error,
		refetch: fetchData,
	};
}
