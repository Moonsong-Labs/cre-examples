import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";

export async function loader({ params }: LoaderFunctionArgs) {
	const { address } = params;

	if (!address) {
		return Response.json({ error: "Missing address" }, { status: 400 });
	}

	const serverUrl = process.env.CRE_HELPER_SERVER_URL || "http://localhost:3000";

	const response = await fetch(`${serverUrl}/04-airdrop/${address}`);

	if (!response.ok) {
		if (response.status === 404) {
			return Response.json({
				address,
				allocatedAmount: "0",
				provedAmount: "0",
				status: "available",
			});
		}
		return Response.json(
			{ error: `Request failed (HTTP ${response.status})` },
			{ status: response.status },
		);
	}

	const data = await response.json();
	return Response.json(data);
}

export async function action({ params }: ActionFunctionArgs) {
	const { address } = params;

	if (!address) {
		return Response.json({ error: "Missing address" }, { status: 400 });
	}

	const serverUrl = process.env.CRE_HELPER_SERVER_URL || "http://localhost:3000";
	const apiKey = process.env.CRE_HELPER_API_KEY;

	if (!apiKey) {
		return Response.json(
			{ error: "Server not configured: missing API key" },
			{ status: 500 },
		);
	}

	const response = await fetch(`${serverUrl}/04-airdrop/${address}/claim`, {
		method: "POST",
		headers: { "X-API-Key": apiKey },
	});

	if (!response.ok) {
		const errorBody = await response.text().catch(() => "");
		return Response.json(
			{ error: `Failed to claim (HTTP ${response.status}): ${errorBody}` },
			{ status: response.status },
		);
	}

	const data = await response.json().catch(() => ({ success: true }));
	return Response.json(data);
}
