"use client";

import { useState } from "react";
import { NewTab } from "@/app/web/NewTab";
import { ProjectsTab } from "@/app/web/ProjectsTab";
import { ShortlistTab } from "@/app/web/ShortlistTab";
import { PostsTab } from "@/app/web/PostsTab";
import { StorageTab } from "@/app/web/StorageTab";
import { AccountsTab } from "@/app/web/AccountsTab";
import { AnalyticsTab } from "@/app/web/AnalyticsTab";
import { SettingsTab } from "@/app/web/SettingsTab";
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
          {tab === "shortlist" && <ShortlistTab />}
          {tab === "posts" && <PostsTab />}
          {tab === "storage" && <StorageTab />}
          {tab === "accounts" && <AccountsTab />}
          {tab === "analytics" && <AnalyticsTab />}
          {tab === "settings" && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}
