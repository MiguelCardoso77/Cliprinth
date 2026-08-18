"use client";

import { useState } from "react";
import { IconAdd, IconBucket, IconDockToLeft, IconDockToRight, IconFolder } from "./icons";

export type Tab = "new" | "projects" | "storage";

export function Sidebar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      <div className={`flex items-center py-4 ${collapsed ? "justify-center" : "px-4"}`}>
        {collapsed ? (
          <span className="font-mono text-sm font-semibold text-accent">C</span>
        ) : (
          <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
            CLIPRINTH
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2">
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
          icon={<IconBucket className="h-5 w-5" />}
          label="Storage"
          active={tab === "storage"}
          collapsed={collapsed}
          onClick={() => onChange("storage")}
        />
      </nav>

      <button
        type="button"
        onClick={() => setCollapsed((current) => !current)}
        title={collapsed ? "Expand menu" : "Collapse menu"}
        className={`flex items-center gap-2 border-t border-border py-3 text-muted transition-colors hover:text-foreground ${
          collapsed ? "justify-center" : "px-4"
        }`}
      >
        {collapsed ? <IconDockToLeft className="h-5 w-5" /> : <IconDockToRight className="h-5 w-5" />}
        {!collapsed && <span className="text-xs">Collapse</span>}
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
      className={`flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors ${
        collapsed ? "justify-center" : "px-3"
      } ${
        active
          ? "bg-accent text-background"
          : "text-muted hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span>{label}</span>}
    </button>
  );
}
