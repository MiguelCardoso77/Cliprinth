"use client";

import { useState } from "react";
import {
  IconAdd,
  IconBucket,
  IconChart,
  IconDockToLeft,
  IconDockToRight,
  IconFolder,
  IconPerson,
  IconPost,
  IconSettings,
  IconStar,
} from "./icons";

export type Tab =
  | "new"
  | "projects"
  | "shortlist"
  | "posts"
  | "storage"
  | "accounts"
  | "analytics"
  | "settings";

export function Sidebar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col bg-sidebar border-r border-border transition-[width] duration-200 ${
        collapsed ? "w-16" : "w-[262px]"
      }`}
    >
      <div className={`flex items-center gap-2.5 py-5 ${collapsed ? "justify-center" : "px-5"}`}>
        <span
          className="h-[11px] w-[11px] shrink-0 rounded-[3px] bg-accent"
          style={{ boxShadow: "0 0 10px 1px var(--accent-soft)" }}
          aria-hidden
        />
        {!collapsed && (
          <span className="font-mono text-[15px] font-semibold tracking-[1.5px] text-foreground">
            CLIPRINTH
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        <NavItem
          icon={<IconAdd className="h-5 w-5" />}
          label="New"
          active={tab === "new"}
          collapsed={collapsed}
          onClick={() => onChange("new")}
        />
        <NavItem
          icon={<IconFolder className="h-5 w-5" />}
          label="Projects"
          active={tab === "projects"}
          collapsed={collapsed}
          onClick={() => onChange("projects")}
        />
        <NavItem
          icon={<IconStar className="h-5 w-5" />}
          label="Shortlist"
          active={tab === "shortlist"}
          collapsed={collapsed}
          onClick={() => onChange("shortlist")}
        />
        <NavItem
          icon={<IconPost className="h-5 w-5" />}
          label="Posts"
          active={tab === "posts"}
          collapsed={collapsed}
          onClick={() => onChange("posts")}
        />
        <NavItem
          icon={<IconBucket className="h-5 w-5" />}
          label="Storage"
          active={tab === "storage"}
          collapsed={collapsed}
          onClick={() => onChange("storage")}
        />
      </nav>

      <div className={`flex flex-col gap-1 border-t border-border py-2 ${collapsed ? "px-2" : "px-3"}`}>
        <NavItem
          icon={<IconChart className="h-5 w-5" />}
          label="Analytics"
          active={tab === "analytics"}
          collapsed={collapsed}
          onClick={() => onChange("analytics")}
        />
        <NavItem
          icon={<IconPerson className="h-5 w-5" />}
          label="Accounts"
          active={tab === "accounts"}
          collapsed={collapsed}
          onClick={() => onChange("accounts")}
        />
        <NavItem
          icon={<IconSettings className="h-5 w-5" />}
          label="Settings"
          active={tab === "settings"}
          collapsed={collapsed}
          onClick={() => onChange("settings")}
        />
      </div>

      <button
        type="button"
        onClick={() => setCollapsed((current) => !current)}
        title={collapsed ? "Expand menu" : "Collapse menu"}
        className={`mt-auto flex items-center gap-2 border-t border-border py-3.5 font-mono text-xs text-muted transition-colors hover:text-foreground ${
          collapsed ? "justify-center" : "px-5"
        }`}
      >
        {collapsed ? <IconDockToLeft className="h-5 w-5" /> : <IconDockToRight className="h-5 w-5" />}
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}

function NavItem({
  icon,
  label,
  active,
  collapsed,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-3 rounded-[10px] py-2.5 font-mono text-[13px] font-medium transition-colors ${
        collapsed ? "justify-center" : "px-3.5"
      } ${
        active
          ? "text-white shadow-[0_2px_10px_-2px_var(--accent-soft)]"
          : "text-[#9aa0a8] hover:bg-white/[0.04] hover:text-foreground"
      }`}
      style={
        active
          ? { background: "linear-gradient(180deg, var(--accent), var(--accent-active))" }
          : undefined
      }
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span>{label}</span>}
    </button>
  );
}
