import { ExternalLinkIcon, InfoIcon, XIcon } from "lucide-react";
import { css } from "styled-system/css";
import { Button, Dialog, Heading, IconButton, Text } from "~/components/ui";

export function AboutCREModal() {
	return (
		<Dialog.Root>
			<Dialog.Trigger asChild>
				<Button variant="plain" size="sm" className={css({ gap: "2" })}>
					<InfoIcon className={css({ width: "4", height: "4" })} />
					About CRE
				</Button>
			</Dialog.Trigger>
			<Dialog.Backdrop />
			<Dialog.Positioner>
				<Dialog.Content
					className={css({
						maxW: "2xl",
						p: "0",
						overflow: "hidden",
						borderRadius: "xl",
					})}
				>
					<div
						className={css({
							bg: "teal.9",
							p: "6",
							color: "white",
							position: "relative",
						})}
					>
						<Dialog.Title
							className={css({ fontSize: "2xl", fontWeight: "bold" })}
						>
							Chainlink Runtime Environment (CRE)
						</Dialog.Title>
						<Dialog.Description className={css({ color: "teal.1", mt: "1" })}>
							Chainlink's workflow engine for composing decentralized oracle
							capabilities.
						</Dialog.Description>
						<Dialog.CloseTrigger asChild>
							<IconButton
								aria-label="Close"
								variant="plain"
								size="sm"
								className={css({
									position: "absolute",
									top: "4",
									right: "4",
									color: "white",
									_hover: { bg: "teal.10" },
								})}
							>
								<XIcon />
							</IconButton>
						</Dialog.CloseTrigger>
					</div>

					<div
						className={css({
							p: "6",
							display: "flex",
							flexDirection: "column",
							gap: "6",
						})}
					>
						<div
							className={css({
								display: "flex",
								gap: "6",
								alignItems: "start",
							})}
						>
							<div className={css({ flex: "1" })}>
								<Heading as="h3" textStyle="md" className={css({ mb: "2" })}>
									What is CRE?
								</Heading>
								<Text className={css({ color: "fg.muted" })}>
									CRE is a workflow orchestration layer that lets developers
									compose Chainlink capabilities—triggers, data fetching,
									consensus, and chain writes—into unified workflows executed
									by decentralized oracle networks (DONs).
								</Text>
							</div>
							<img
								src="/workflow-nodes.png"
								alt="Workflow Nodes"
								className={css({
									width: "32",
									height: "32",
									objectFit: "contain",
								})}
							/>
						</div>

						<div
							className={css({
								gridTemplateColumns: "1fr 1fr",
								display: "grid",
								gap: "6",
							})}
						>
							<div className={css({ spaceY: "2" })}>
								<div
									className={css({
										display: "flex",
										alignItems: "center",
										gap: "2",
									})}
								>
									<img
										src="/paper-plane.png"
										alt="Capabilities"
										className={css({ width: "6", height: "6" })}
									/>
									<Heading as="h4" textStyle="sm">
										Capabilities
									</Heading>
								</div>
								<Text textStyle="sm" className={css({ color: "fg.muted" })}>
									Modular building blocks—cron/event triggers, HTTP fetches,
									chain reads, consensus, and transaction writes—each run by
									specialized DONs.
								</Text>
							</div>

							<div className={css({ spaceY: "2" })}>
								<div
									className={css({
										display: "flex",
										alignItems: "center",
										gap: "2",
									})}
								>
									<img
										src="/shield.png"
										alt="Workflows"
										className={css({ width: "6", height: "6" })}
									/>
									<Heading as="h4" textStyle="sm">
										Workflows
									</Heading>
								</div>
								<Text textStyle="sm" className={css({ color: "fg.muted" })}>
									Compose capabilities into end-to-end pipelines using Go or
									TypeScript. One workflow replaces fragmented multi-service
									setups.
								</Text>
							</div>
						</div>

				
					</div>

					<div
						className={css({
							p: "6",
							borderTop: "1px solid",
							borderColor: "border.subtle",
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							bg: "bg.muted",
						})}
					>
						<a
							href="https://docs.chain.link/cre"
							target="_blank"
							rel="noreferrer"
							className={css({
								display: "flex",
								alignItems: "center",
								gap: "2",
								color: "teal.9",
								textStyle: "sm",
								fontWeight: "medium",
								transition: "color 0.2s",
								_hover: { color: "teal.10", textDecoration: "underline" },
							})}
						>
							Read the docs
							<ExternalLinkIcon className={css({ width: "4", height: "4" })} />
						</a>
						<Dialog.CloseTrigger asChild>
							<Button variant="outline">Close</Button>
						</Dialog.CloseTrigger>
					</div>
				</Dialog.Content>
			</Dialog.Positioner>
		</Dialog.Root>
	);
}
