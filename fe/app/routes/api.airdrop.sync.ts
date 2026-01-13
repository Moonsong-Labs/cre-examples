export async function action() {
	const serverUrl = process.env.CRE_HELPER_SERVER_URL || "http://localhost:3000";
	const apiKey = process.env.CRE_HELPER_API_KEY;

	if (!apiKey) {
		return Response.json(
			{ error: "Server not configured: missing API key" },
			{ status: 500 },
		);
	}

	const response = await fetch(`${serverUrl}/04-airdrop/sync`, {
		method: "POST",
		headers: { "X-API-Key": apiKey },
	});

	if (!response.ok) {
		const errorBody = await response.text().catch(() => "");
		return Response.json(
			{ error: `Failed to sync (HTTP ${response.status}): ${errorBody}` },
			{ status: response.status },
		);
	}

	const data = await response.json().catch(() => ({ success: true }));
	return Response.json(data);
}
