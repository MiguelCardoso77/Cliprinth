"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NewTab } from "@/app/web/NewTab";
import { ProjectsTab } from "@/app/web/ProjectsTab";
import { ShortlistTab } from "@/app/web/ShortlistTab";
import { PostsTab } from "@/app/web/PostsTab";
import { StorageTab } from "@/app/web/StorageTab";
import { AccountsTab } from "@/app/web/AccountsTab";
import { AnalyticsTab } from "@/app/web/AnalyticsTab";
import { SettingsTab } from "@/app/web/SettingsTab";
import { Sidebar, Tab } from "@/app/web/Sidebar";

const TABS: Tab[] = [
  "new",
  "projects",
  "shortlist",
  "posts",
  "storage",
  "accounts",
  "analytics",
  "settings",
];

function isTab(value: string | null): value is Tab {
  return value !== null && (TABS as string[]).includes(value);
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  // Lets server-side redirects (e.g. the OAuth account-linking callback)
  // land the user back on a specific tab via ?tab=accounts.
  const [tab, setTab] = useState<Tab>(() => {
    const tabParam = searchParams.get("tab");
    return isTab(tabParam) ? tabParam : "new";
  });

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      <Sidebar tab={tab} onChange={setTab} />
      <main className="flex-1 overflow-y-auto px-8 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-[1080px]">
          {TABS.map((t) => {
            const active = tab === t;
            return (
              <div key={t} hidden={!active}>
                {t === "new" && <NewTab />}
                {t === "projects" && <ProjectsTab active={active} />}
                {t === "shortlist" && <ShortlistTab active={active} />}
                {t === "posts" && <PostsTab active={active} />}
                {t === "storage" && <StorageTab active={active} />}
                {t === "accounts" && <AccountsTab active={active} />}
                {t === "analytics" && <AnalyticsTab />}
                {t === "settings" && <SettingsTab active={active} />}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
