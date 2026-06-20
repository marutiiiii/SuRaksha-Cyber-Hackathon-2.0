import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import ModeBanner from "./shared/ModeBanner";

export default function Layout() {
  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: "#050816" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <ModeBanner />
        <main
          className="flex-1 p-6 overflow-auto"
          style={{ background: "transparent" }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
