import { Loader2 } from "lucide-react";
import { useState } from "react";
import { css } from "styled-system/css";
import { useWalletClient } from "wagmi";
import { Button } from "~/components/ui";

export interface AddToWalletButtonProps {
	/** Token contract address */
	address: string;
	/** Token symbol (e.g., "USDC", "TCT") */
	symbol: string;
	/** Token decimals */
	decimals: number;
	/** Token logo image URL (optional) */
	image?: string;
	/** Button size */
	size?: "sm" | "md" | "lg";
	/** Button variant */
	variant?: "outline" | "subtle" | "solid" | "surface" | "plain";
	/** Custom button text */
	label?: string;
	/** Callback when token is successfully added */
	onSuccess?: () => void;
	/** Callback when there's an error */
	onError?: (error: Error) => void;
}

/**
 * Reusable button component to add ERC20 tokens to user's wallet.
 * Works with any EIP-6963 compatible wallet (MetaMask, Coinbase Wallet, etc).
 */
export function AddToWalletButton({
	address,
	symbol,
	decimals,
	image = "",
	size = "sm",
	variant = "outline",
	label,
	onSuccess,
	onError,
}: AddToWalletButtonProps) {
	const { data: walletClient } = useWalletClient();
	const [isAdding, setIsAdding] = useState(false);

	const handleAddToken = async () => {
		try {
			setIsAdding(true);

			if (!walletClient) {
				const error = new Error(
					"Wallet not connected. Please connect your wallet first.",
				);
				onError?.(error);
				alert(error.message);
				setIsAdding(false);
				return;
			}

			await walletClient.watchAsset({
				type: "ERC20",
				options: {
					address: address as `0x${string}`,
					symbol,
					decimals,
					image,
				},
			});

			console.log(`Token ${symbol} added to wallet successfully`);
			onSuccess?.();
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			console.error(`Failed to add ${symbol} to wallet:`, err);
			onError?.(err);
		} finally {
			setIsAdding(false);
		}
	};

	const buttonLabel = label ?? `Add ${symbol} to Wallet`;

	return (
		<Button
			onClick={() => void handleAddToken()}
			variant={variant}
			size={size}
			disabled={isAdding}
		>
			{isAdding ? (
				<>
					<Loader2
						className={css({ width: "3.5", height: "3.5", animation: "spin" })}
					/>
					Adding...
				</>
			) : (
				buttonLabel
			)}
		</Button>
	);
}
