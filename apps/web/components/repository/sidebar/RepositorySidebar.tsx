import { ProjectSwitcher } from "@/components/project/sidebar/ProjectSwitcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { RepositorySidebarMain } from "./RepositorySidebarMain";
import { AppSidebarProfile } from "@/components/app/sidebar/AppSidebarProfile";
import { useUser } from "@/hooks/providers/UserProvider";
import { repositorySidebarConfig } from "@/components/repository/sidebar/config/config";
import { AppSidebarFooter } from "@/components/app/sidebar/AppSidebarFooter";
import { appSidebarConfig } from "@/components/app/sidebar/config/config";
import { RepositorySwitcher } from "./RepositorySwitcher";

export function RepositorySidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { profile } = useUser();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <RepositorySwitcher />
      </SidebarHeader>
      <SidebarContent>
        <RepositorySidebarMain config={repositorySidebarConfig.hero} />
        <AppSidebarFooter
          config={appSidebarConfig.footer}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <AppSidebarProfile profile={profile} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
