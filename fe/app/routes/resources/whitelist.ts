import { data } from "react-router";
import type { Route } from "./+types/whitelist";

const DEFAULT_SERVER_URL = "http://localhost:3000";

function resolveServerUrl(raw?: string | null) {
	const candidate = raw?.trim();
	if (!candidate) return DEFAULT_SERVER_URL;

	const withProtocol =
		candidate.startsWith("http://") || candidate.startsWith("https://")
			? candidate
			: `http://${candidate}`;

	return withProtocol.replace(/\/+$/, "");
}

function getServerUrl() {
	return resolveServerUrl(import.meta.env.VITE_CRE_HELPER_SERVER_URL);
}

function getApiKey() {
	const candidate = import.meta.env.VITE_CRE_HELPER_API_KEY;
	const trimmed = candidate?.trim();
	return trimmed ? trimmed : null;
}

async function parseErrorMessage(response: Response) {
	try {
		const body = (await response.json()) as { error?: string };
		if (body.error) return body.error;
		return null;
	} catch {
		return null;
	}
}

async function ping(serverUrl: string) {
	const response = await fetch(`${serverUrl}/`);
	if (!response.ok) {
		throw new Error(`CRE helper server not reachable (${response.status})`);
	}

	const body = (await response.json()) as { ok?: boolean };
	if (!body.ok) {
		throw new Error("CRE helper server did not report healthy");
	}
}

async function isRegistered(serverUrl: string, address: string) {
	const response = await fetch(`${serverUrl}/whitelist/${address}`);
	if (!response.ok) {
		const message = await parseErrorMessage(response);
		throw new Error(
			message
				? `Whitelist check failed: ${message}`
				: `Whitelist check failed (${response.status})`,
		);
	}

	const body = (await response.json()) as { registered?: boolean };
	return Boolean(body.registered);
}

async function addAddress(serverUrl: string, address: string) {
	const apiKey = getApiKey();
	if (!apiKey) {
		throw new Error("Missing VITE_CRE_HELPER_API_KEY");
	}

	const response = await fetch(`${serverUrl}/whitelist/add/${address}`, {
		method: "POST",
		headers: { "X-API-Key": apiKey },
	});

	if (!response.ok) {
		const message = await parseErrorMessage(response);
		throw new Error(
			message
				? `Whitelist add failed: ${message}`
				: `Whitelist add failed (${response.status})`,
		);
	}
}

export async function clientLoader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const address = url.searchParams.get("address");

	if (!address) {
		return data({ ok: false, error: "Missing address" }, { status: 400 });
	}

	const serverUrl = getServerUrl();

	try {
		await ping(serverUrl);
		const registered = await isRegistered(serverUrl, address);
		return data({ ok: true, healthy: true, registered }, { status: 200 });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to check whitelist";
		return data({ ok: false, error: message }, { status: 502 });
	}
}

export async function clientAction({ request }: Route.ActionArgs) {
	const formData = await request.formData();
	const address = formData.get("address");

	if (typeof address !== "string" || !address) {
		return data({ ok: false, error: "Missing address" }, { status: 400 });
	}

	const serverUrl = getServerUrl();

	try {
		await ping(serverUrl);
		const alreadyRegistered = await isRegistered(serverUrl, address);
		if (alreadyRegistered) {
			return data(
				{ ok: true, registered: true, alreadyRegistered: true },
				{ status: 200 },
			);
		}

		await addAddress(serverUrl, address);
		return data(
			{ ok: true, registered: true, alreadyRegistered: false },
			{ status: 200 },
		);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to whitelist address";
		return data({ ok: false, error: message }, { status: 502 });
	}
}
