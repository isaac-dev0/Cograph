"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { SidebarIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function DashboardHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <SidebarIcon />
        </Button>
        <Separator orientation="vertical" className="ml-1 mr-2 h-4" />
      </div>
    </header>
  );
}
