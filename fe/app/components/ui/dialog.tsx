import { Dialog as ArkDialog } from "@ark-ui/react/dialog";
import { Portal } from "@ark-ui/react/portal";
import { ark } from "@ark-ui/react/factory";
import { forwardRef, type ReactNode } from "react";
import { createStyleContext } from "styled-system/jsx";
import { dialog } from "styled-system/recipes";

const { withProvider, withContext } = createStyleContext(dialog);

export interface RootProps extends ArkDialog.RootProps {}
export const Root = withProvider(ArkDialog.Root, "root");

export const Backdrop = withContext(ArkDialog.Backdrop, "backdrop");
export const CloseTrigger = withContext(ArkDialog.CloseTrigger, "closeTrigger");
export const Content = withContext(ArkDialog.Content, "content");
export const Description = withContext(ArkDialog.Description, "description");
export const Positioner = withContext(ArkDialog.Positioner, "positioner");
export const Title = withContext(ArkDialog.Title, "title");
export const Trigger = withContext(ArkDialog.Trigger, "trigger");

export interface DialogProps extends RootProps {
	children?: ReactNode;
}

export const Dialog = forwardRef<HTMLDivElement, DialogProps>((props, ref) => {
	const { children, ...rootProps } = props;
	return (
		<Root {...rootProps}>
			<Portal>
				<Backdrop />
				<Positioner>
					<Content ref={ref}>{children}</Content>
				</Positioner>
			</Portal>
		</Root>
	);
});

Dialog.displayName = "Dialog";
