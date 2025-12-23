import { type HTTPSendRequester, json, ok, text } from "@chainlink/cre-sdk";
import type { MerkleTreeData } from "./merkle";

export type ProofsUploadResult = {
	ok: boolean;
	inserted: number;
	updated: number;
	skipped: number;
	deleted: number;
};

export function uploadProofs(
	sendRequester: HTTPSendRequester,
	baseUrl: string,
	apiKey: string,
	merkleTreeData: MerkleTreeData,
): ProofsUploadResult {
	const url = `${baseUrl}/proofs`;

	const payload = JSON.stringify({
		root: merkleTreeData.root,
		proofs: merkleTreeData.proofs,
	});

	const bodyBytes = new TextEncoder().encode(payload);
	const body = Buffer.from(bodyBytes).toString("base64");

	const resp = sendRequester
		.sendRequest({
			url,
			method: "POST",
			body,
			headers: {
				"Content-Type": "application/json",
				"X-API-Key": apiKey,
			},
			cacheSettings: {
				store: true,
				maxAge: "20s",
			},
		})
		.result();

	if (!ok(resp)) {
		throw new Error(`Upload proofs failed: ${resp.statusCode} - ${text(resp)}`);
	}

	return json(resp) as ProofsUploadResult;
}
