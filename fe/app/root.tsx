import {
	isRouteErrorResponse,
	Link,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import stylesheet from "./app.css?url";
import "./app.css";
import { css } from "styled-system/css";
import { Providers } from "~/components/providers";
import { Button, Heading, Spinner, Text } from "~/components/ui";

export const links: Route.LinksFunction = () => [
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous",
	},
	{ rel: "stylesheet", href: stylesheet },
];

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return (
		<Providers>
			<Outlet />
		</Providers>
	);
}

export function HydrateFallback() {
	return (
		<div
			className={css({
				minHeight: "100vh",
				display: "grid",
				placeItems: "center",
				bg: "gray.1",
			})}
		>
			<div
				className={css({
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "4",
				})}
			>
				<Spinner size="lg" colorPalette="teal" />
				<Text className={css({ color: "fg.muted" })}>Loading...</Text>
			</div>
		</div>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details =
			error.status === 404
				? "The requested page could not be found."
				: error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main
			className={css({
				minHeight: "100vh",
				display: "grid",
				placeItems: "center",
				p: { base: "6", md: "10" },
				bg: "gray.1",
				color: "fg.default",
			})}
		>
			<div
				className={css({
					width: "full",
					maxWidth: "lg",
					textAlign: "center",
					bg: "gray.surface.bg",
					border: "1px solid",
					borderColor: "border",
					borderRadius: "2xl",
					p: { base: "6", md: "10" },
					boxShadow: "lg",
				})}
			>
				<Heading as="h1" textStyle="4xl" className={css({ mb: "2" })}>
					{message}
				</Heading>
				<Text className={css({ color: "fg.muted", mb: "6" })}>{details}</Text>
				<Link to="/">
					<Button variant="surface" colorPalette="teal">
						Back home
					</Button>
				</Link>
				{stack && (
					<pre
						className={css({
							mt: "6",
							textAlign: "left",
							bg: "gray.2",
							p: "4",
							borderRadius: "lg",
							overflowX: "auto",
							fontSize: "xs",
						})}
					>
						<code>{stack}</code>
					</pre>
				)}
			</div>
		</main>
	);
}
