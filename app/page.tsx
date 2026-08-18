"use client";

import { useState } from "react";
import { NewTab } from "@/app/web/NewTab";
import { ProjectsTab } from "@/app/web/ProjectsTab";
import { StorageTab } from "@/app/web/StorageTab";
import { Sidebar, Tab } from "@/app/web/Sidebar";

export default function Home() {
  const [tab, setTab] = useState<Tab>("new");

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      <Sidebar tab={tab} onChange={setTab} />
      <main className="flex-1 overflow-y-auto px-8 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-[1080px]">
          {tab === "new" && <NewTab />}
          {tab === "projects" && <ProjectsTab />}
          {tab === "storage" && <StorageTab />}
        </div>
      </main>
    </div>
  );
}
