import { css } from "styled-system/css";
import { Text } from "~/components/ui";
import { getConfigInstructions, getConfigStatus } from "~/lib/config";

export function ConfigWarningBanner() {
	const config = getConfigStatus();

	if (config.isConfigured) return null;

	const instructions = getConfigInstructions(config.missingVars);

	return (
		<div
			className={css({
				bg: "amber.2",
				borderWidth: "1px",
				borderColor: "amber.6",
				borderRadius: "lg",
				p: "4",
				mb: "4",
			})}
		>
			<Text
				className={css({
					fontWeight: "semibold",
					color: "amber.11",
					mb: "2",
				})}
			>
				CRE Helper Server Not Configured
			</Text>
			<Text className={css({ color: "amber.12", fontSize: "sm", mb: "3" })}>
				Some features require a connection to the CRE helper server. Without it,
				relay status tracking and whitelisting will not work.
			</Text>
			<pre
				className={css({
					bg: "amber.3",
					p: "3",
					borderRadius: "md",
					fontSize: "xs",
					overflow: "auto",
					whiteSpace: "pre-wrap",
					color: "amber.12",
				})}
			>
				{instructions}
			</pre>
		</div>
	);
}
