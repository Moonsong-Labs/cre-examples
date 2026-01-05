import { PlayCircleIcon, XIcon } from "lucide-react";
import { css } from "styled-system/css";
import { Dialog, IconButton } from "~/components/ui";

interface VideoModalProps {
	videoSrc: string;
	title?: string;
}

export function VideoModal({ videoSrc, title }: VideoModalProps) {
	return (
		<Dialog.Root>
			<Dialog.Trigger asChild>
				<button
					type="button"
					className={css({
						background:
							"linear-gradient(120deg, rgba(255,255,255,0.4) 40%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.4) 60%)",
						backgroundSize: "200% 100%",
						backgroundClip: "text",
						color: "fg.muted",
						animation: "shine 2.5s linear infinite",
						fontWeight: "medium",
						fontSize: "sm",
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						gap: "1.5",
						border: "none",
						bg: "transparent",
						p: "0",
						_hover: { color: "fg.default" },
					})}
				>
					<PlayCircleIcon className={css({ width: "4", height: "4" })} />
					Video
				</button>
			</Dialog.Trigger>
			<Dialog.Backdrop />
			<Dialog.Positioner>
				<Dialog.Content
					className={css({
						maxW: "4xl",
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
							<Dialog.Title className={css({ fontSize: "md", fontWeight: "semibold" })}>
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
					<video
						autoPlay
						muted
						controls
						playsInline
						className={css({ width: "100%", display: "block" })}
					>
						<source src={videoSrc} type="video/mp4" />
						Your browser does not support the video tag.
					</video>
				</Dialog.Content>
			</Dialog.Positioner>
		</Dialog.Root>
	);
}
