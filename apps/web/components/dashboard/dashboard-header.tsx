"use client"

import { SidebarIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useSidebar } from "../ui/sidebar";
import { Separator } from "../ui/separator";

export function DashboardHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <SidebarIcon />
        </Button>
        <Separator orientation="vertical" className="mr-2 h-4" />
      </div>
    </header>
  );
}
