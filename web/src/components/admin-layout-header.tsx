"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAdminHeader } from "@/contexts/admin-header-context";

export function AdminLayoutHeader() {
  const { title, description, actions } = useAdminHeader();

  return (
    <header className="flex min-h-16 shrink-0 items-center gap-2 border-b px-4 bg-background rounded-t-xl">
      <SidebarTrigger data-testid="admin-sidebar-toggle" />
      <div className="h-4 w-px bg-border mx-2" />
      <div className="flex-1">
        <h1 data-testid="admin-page-header" className="text-lg font-semibold">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
