import { type HTTPSendRequester } from "@chainlink/cre-sdk";
import { z } from "zod";

// Schema for validating Ethereum addresses
const AddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address");

// Schema for the blacklist response - deterministic shape
const BlacklistSchema = z.object({
  addresses: z.array(AddressSchema),
  count: z.number(),
});

export type Blacklist = z.infer<typeof BlacklistSchema>;

// Parse CSV response into Blacklist
function parseBlacklistCsv(csv: string): Blacklist {
  // Check if we got an HTML error page instead of CSV.
  if (csv.trimStart().startsWith("<!DOCTYPE") || csv.trimStart().startsWith("<html")) {
    throw new Error(
      "Spreadsheet is not publicly accessible. Please set sharing to 'Anyone with the link can view'."
    );
  }

  const lines = csv.split("\n").slice(1); // skip header row

  // Keep track of original row numbers (1-based, +1 for header)
  const addressesWithRows: { value: string; row: number }[] = [];
  const emptyRows: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const row = i + 2; // +2: 1 for header, 1 for 1-based
    const trimmed = lines[i].trim().toLowerCase();
    if (trimmed.length > 0) {
      addressesWithRows.push({ value: trimmed, row });
    } else {
      emptyRows.push(row);
    }
  }

  if (emptyRows.length > 0) {
    const rowList = emptyRows.map((r) => `#${r}`).join(", ");
    throw new Error(`Spreadsheet contains empty rows: ${rowList}`);
  }

  const addresses = addressesWithRows.map((a) => a.value);

  const result: Blacklist = {
    addresses,
    count: addresses.length,
  };

  const parsed = BlacklistSchema.safeParse(result);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => {
      const index = issue.path[1] as number;
      const { value, row } = addressesWithRows[index];
      return `Row ${row}: "${value}" - ${issue.message}`;
    });
    throw new Error(`Spreadsheet validation failed:\n${errors.join("\n")}`);
  }

  return parsed.data;
}

// Fetch blacklist using HTTPClient (runs in node mode with consensus)
export function fetchBlacklist(
  sendRequester: HTTPSendRequester,
  spreadsheetId: string
): Blacklist {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;

  const response = sendRequester.sendRequest({
    url,
    method: "GET",
    headers: {},
  });

  const body = response.result().body;
  const csv = new TextDecoder().decode(body);

  return parseBlacklistCsv(csv);
}