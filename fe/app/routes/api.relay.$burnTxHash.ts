import type { LoaderFunctionArgs } from "react-router";

export async function loader({ params }: LoaderFunctionArgs) {
	const { burnTxHash } = params;

	if (!burnTxHash) {
		return Response.json({ error: "Missing burnTxHash" }, { status: 400 });
	}

	const serverUrl = process.env.CRE_HELPER_SERVER_URL;
	const apiKey = process.env.CRE_HELPER_API_KEY;

	if (!serverUrl) {
		return Response.json(
			{ error: "Server not configured: missing server URL" },
			{ status: 500 },
		);
	}

	const response = await fetch(`${serverUrl}/01-relay/mailbox/${burnTxHash}`, {
		headers: { "x-api-key": apiKey ?? "" },
	});

	if (!response.ok) {
		return Response.json(null, { status: response.status });
	}

	const data = await response.json();
	return Response.json(data);
}
