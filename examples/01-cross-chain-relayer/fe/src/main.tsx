import "@rainbow-me/rainbowkit/styles.css";
import "./index.css";

import { darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";
import App from "./App.tsx";
import { config } from "./config/wagmi.ts";

const queryClient = new QueryClient();

// biome-ignore lint/style/noNonNullAssertion: boilerplate
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>
				<RainbowKitProvider modalSize="compact">
					<App />
				</RainbowKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	</StrictMode>,
);
