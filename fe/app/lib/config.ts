export interface ConfigStatus {
	creHelperUrl: string | null;
	creHelperApiKey: string | null;
	isConfigured: boolean;
	missingVars: string[];
}

export function getConfigStatus(): ConfigStatus {
	const creHelperUrl =
		import.meta.env.VITE_CRE_HELPER_SERVER_URL?.trim() || null;
	const creHelperApiKey =
		import.meta.env.VITE_CRE_HELPER_API_KEY?.trim() || null;

	const missingVars: string[] = [];
	if (!creHelperUrl) missingVars.push("VITE_CRE_HELPER_SERVER_URL");
	if (!creHelperApiKey) missingVars.push("VITE_CRE_HELPER_API_KEY");

	return {
		creHelperUrl,
		creHelperApiKey,
		isConfigured: missingVars.length === 0,
		missingVars,
	};
}

export function getConfigInstructions(missingVars: string[]): string {
	if (missingVars.length === 0) return "";

	const varList = missingVars.map((v) => `  ${v}=<your-value>`).join("\n");

	return `Create or update your .env file in the fe/ directory:

${varList}

Then restart the dev server.`;
}
