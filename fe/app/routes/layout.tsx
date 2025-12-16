import { Outlet } from "react-router";
import { AppLayout } from "~/components/app-layout";

export default function Layout() {
	return (
		<AppLayout>
			<Outlet />
		</AppLayout>
	);
}
