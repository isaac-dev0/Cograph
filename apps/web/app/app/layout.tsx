"use client";

import { RepositoryEmptyView } from "@/components/repository/view/RepositoryEmptyView";
import { MainSidebar } from "@/components/sidebar/MainSidebar";
import { RepositorySidebar } from "@/components/repository/sidebar/RepositorySidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useRepository } from "@/hooks/providers/RepositoryProvider";
import { Toaster } from "sonner";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { currentRepository, repositories, isLoading } = useRepository();

  return (
    <>
      <Toaster position="top-right" richColors />
      {!isLoading && repositories.length === 0 ? (
        <RepositoryEmptyView />
      ) : (
        <SidebarProvider>
          {currentRepository ? <RepositorySidebar /> : <MainSidebar />}
          <SidebarInset className="flex flex-col overflow-hidden">
            {children}
          </SidebarInset>
        </SidebarProvider>
      )}
    </>
  );
}
