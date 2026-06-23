import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function Layout() {
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main
          className="flex-1 p-6 overflow-auto bg-transparent"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
