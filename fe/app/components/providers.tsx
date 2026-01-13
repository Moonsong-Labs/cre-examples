import "@rainbow-me/rainbowkit/styles.css";

import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import { type State, WagmiProvider } from "wagmi";
import { config } from "~/config/wagmi";

interface ProvidersProps {
	children: ReactNode;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	initialState?: any;
}

export function Providers({ children, initialState }: ProvidersProps) {
	const [queryClient] = useState(() => new QueryClient());
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	return (
		<WagmiProvider config={config} initialState={initialState as State | undefined}>
			<QueryClientProvider client={queryClient}>
				{mounted ? (
					<RainbowKitProvider modalSize="compact">{children}</RainbowKitProvider>
				) : (
					children
				)}
			</QueryClientProvider>
		</WagmiProvider>
	);
}
