export async function loader() {
	const serverUrl = process.env.CRE_HELPER_SERVER_URL || "http://localhost:3000";
	const apiKey = process.env.CRE_HELPER_API_KEY;

	if (!apiKey) {
		return Response.json(
			{ error: "Server not configured: missing API key" },
			{ status: 500 },
		);
	}

	const response = await fetch(`${serverUrl}/02-compliance/allowlist`, {
		headers: { "X-API-Key": apiKey },
	});

	if (!response.ok) {
		return Response.json(
			{ error: `Failed to fetch allowlist (HTTP ${response.status})` },
			{ status: response.status },
		);
	}

	const data = await response.json();
	return Response.json(data);
}
