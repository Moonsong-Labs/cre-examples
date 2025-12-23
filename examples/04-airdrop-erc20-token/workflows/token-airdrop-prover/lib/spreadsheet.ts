import type { HTTPSendRequester } from "@chainlink/cre-sdk";
import { z } from "zod";

export type AllocationEntry = {
	address: string;
	amount: string;
};

export type Allocations = {
	entries: AllocationEntry[];
	count: number;
};

const SheetsApiResponseSchema = z.object({
	values: z.array(z.array(z.string())).optional(),
});

export function fetchAllocations(
	sendRequester: HTTPSendRequester,
	spreadsheetId: string,
	apiKey: string,
): Allocations {
	// Fetch columns A and B (address, amount)
	const range = encodeURIComponent("A:B");
	const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;

	const response = sendRequester.sendRequest({
		url,
		method: "GET",
		headers: {},
	});

	const body = response.result().body;
	const json = new TextDecoder().decode(body);
	const data = SheetsApiResponseSchema.parse(JSON.parse(json));

	const rows = data.values ?? [];
	// Skip header row, extract address and amount
	const entries: AllocationEntry[] = rows.slice(1).map((row) => ({
		address: row[0]?.toLowerCase() ?? "",
		amount: row[1] ?? "0",
	}));

	return { entries, count: entries.length };
}
