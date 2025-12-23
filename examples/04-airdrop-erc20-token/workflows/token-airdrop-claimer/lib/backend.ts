import { type HTTPSendRequester, ok, text } from "@chainlink/cre-sdk";
import type { Hex } from "viem";

export type ClaimCompleteResult = {
	ok: boolean;
	statusCode: number;
};

export function postClaimComplete(
	sendRequester: HTTPSendRequester,
	baseUrl: string,
	apiKey: string,
	address: Hex,
): ClaimCompleteResult {
	const url = `${baseUrl}/${address}/complete`;

	const resp = sendRequester
		.sendRequest({
			url,
			method: "POST",
			headers: {
				"X-API-Key": apiKey,
			},
			cacheSettings: {
				store: true,
				maxAge: "20s",
			},
		})
		.result();

	if (!ok(resp)) {
		return {
			ok: false,
			statusCode: resp.statusCode,
		};
	}

	return {
		ok: true,
		statusCode: resp.statusCode,
	};
}
