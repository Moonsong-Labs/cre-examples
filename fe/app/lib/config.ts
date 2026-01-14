export interface ConfigStatus {
	creHelperUrl: string | null;
	isConfigured: boolean;
	missingVars: string[];
}

export function getConfigInstructions(missingVars: string[]): string {
	if (missingVars.length === 0) return "";

	const varList = missingVars.map((v) => `  ${v}=<your-value>`).join("\n");

	return `Create or update your .env file in the fe/ directory:

${varList}
  CRE_HELPER_API_KEY=<your-api-key>

Then restart the dev server.`;
}
