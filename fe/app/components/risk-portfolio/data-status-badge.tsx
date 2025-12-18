import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { css } from "styled-system/css";
import { Badge } from "~/components/ui";
import type { DataStatus } from "~/lib/risk-portfolio";

interface DataStatusBadgeProps {
	status: DataStatus;
	updatedAt: Date | null;
}

function formatTimeAgo(date: Date): string {
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

	if (seconds < 60) return "just now";
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
	return `${Math.floor(seconds / 86400)}d ago`;
}

export function DataStatusBadge({ status, updatedAt }: DataStatusBadgeProps) {
	if (status === "loading") {
		return (
			<Badge variant="subtle" colorPalette="gray" size="md">
				<Loader2
					className={css({ width: "3.5", height: "3.5", animation: "spin" })}
				/>
				Loading metrics...
			</Badge>
		);
	}

	if (status === "stale") {
		return (
			<Badge variant="subtle" colorPalette="red" size="md">
				<AlertTriangle className={css({ width: "3.5", height: "3.5" })} />
				Stale data {updatedAt && `(${formatTimeAgo(updatedAt)})`}
			</Badge>
		);
	}

	return (
		<Badge variant="subtle" colorPalette="green" size="md">
			<CheckCircle className={css({ width: "3.5", height: "3.5" })} />
			Data fresh {updatedAt && `(${formatTimeAgo(updatedAt)})`}
		</Badge>
	);
}
