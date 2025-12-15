import { type HTTPSendRequester } from "@chainlink/cre-sdk";
import { z } from "zod";

const AddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address");

const BlacklistSchema = z.object({
  addresses: z.array(AddressSchema),
  count: z.number(),
});

export type Blacklist = z.infer<typeof BlacklistSchema>;

const SheetsApiResponseSchema = z.object({
  values: z.array(z.array(z.string())).optional(),
});

export function fetchBlacklist(
  sendRequester: HTTPSendRequester,
  spreadsheetId: string,
  apiKey: string
): Blacklist {
  const range = encodeURIComponent("A:A");
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
  // Skip header row, extract addresses
  const addresses = rows.slice(1).map(row => row[0]?.toLowerCase() ?? "");

  const result: Blacklist = { addresses, count: addresses.length };

  return BlacklistSchema.parse(result);
}
