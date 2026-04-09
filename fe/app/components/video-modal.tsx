import { Portal } from "@ark-ui/react/portal";
import { PlayCircleIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { css } from "styled-system/css";
import { Dialog, IconButton } from "~/components/ui";

interface VideoModalProps {
	youtubeId: string;
	title?: string;
	label?: string;
}

export function VideoModal({
	youtubeId,
	title,
	label = "Watch video",
}: VideoModalProps) {
	const [open, setOpen] = useState(false);

	return (
		<Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
			<Dialog.Trigger asChild>
				<button
					type="button"
					className={css({
						color: "rgba(44,52,55,0.68)",
						fontWeight: "medium",
						fontSize: "sm",
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						gap: "1.5",
						border: "none",
						bg: "transparent",
						p: "0",
						borderBottom: "1px solid transparent",
						transition: "color 150ms ease, border-color 150ms ease",
						_hover: {
							color: "#2c3437",
							borderColor: "rgba(44,52,55,0.22)",
						},
					})}
				>
					<PlayCircleIcon className={css({ width: "4", height: "4" })} />
					{label}
				</button>
			</Dialog.Trigger>
			<Portal>
				<Dialog.Backdrop />
				<Dialog.Positioner>
					<Dialog.Content
						className={css({
							width: "80vw",
							maxW: "1280px",
							p: "0",
							overflow: "hidden",
							borderRadius: "xl",
						})}
					>
						{title && (
							<div
								className={css({
									bg: "gray.3",
									px: "4",
									py: "3",
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
								})}
							>
								<Dialog.Title
									className={css({ fontSize: "md", fontWeight: "semibold" })}
								>
									{title}
								</Dialog.Title>
							</div>
						)}
						<Dialog.CloseTrigger asChild>
							<IconButton
								aria-label="Close"
								variant="plain"
								size="sm"
								className={css({
									position: "absolute",
									top: "2",
									right: "2",
									zIndex: 10,
									color: "white",
									bg: "blackAlpha.500",
									borderRadius: "full",
									_hover: { bg: "blackAlpha.700" },
								})}
							>
								<XIcon />
							</IconButton>
						</Dialog.CloseTrigger>
						{open && (
							<iframe
								src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&mute=0&rel=0`}
								title={title ?? "Video"}
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
								allowFullScreen
								className={css({
									width: "100%",
									aspectRatio: "16 / 9",
									display: "block",
									border: "none",
								})}
							/>
						)}
					</Dialog.Content>
				</Dialog.Positioner>
			</Portal>
		</Dialog.Root>
	);
}
