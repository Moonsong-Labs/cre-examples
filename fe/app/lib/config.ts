export interface ConfigStatus {
	creHelperUrl: string | null;
	isConfigured: boolean;
	missingVars: string[];
}

export function getConfigStatus(): ConfigStatus {
	const creHelperUrl =
		import.meta.env.VITE_CRE_HELPER_SERVER_URL?.trim() || null;

	const missingVars: string[] = [];
	if (!creHelperUrl) missingVars.push("VITE_CRE_HELPER_SERVER_URL");
	// Note: CRE_HELPER_API_KEY is server-only (no VITE_ prefix) and checked at runtime

	return {
		creHelperUrl,
		isConfigured: missingVars.length === 0,
		missingVars,
	};
}

export function getConfigInstructions(missingVars: string[]): string {
	if (missingVars.length === 0) return "";

	const varList = missingVars.map((v) => `  ${v}=<your-value>`).join("\n");

	return `Create or update your .env file in the fe/ directory:

${varList}
  CRE_HELPER_API_KEY=<your-api-key>

Then restart the dev server.`;
}
