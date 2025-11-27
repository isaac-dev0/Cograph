import { LucideIcon, MessageCircleQuestionMark } from "lucide-react";
import { SidebarGroup } from "@/components/ui/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DashboardSidebarSecondary({
  ...props
}: React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <Card className="mx-1 gap-4 mt-4 py-4 shadow-none">
        <CardHeader className="px-4">
          <CardTitle className="text-sm">We want your feedback!</CardTitle>
          <CardDescription>
            Complete a short survey and provide your feedback.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4">
          <form>
            <div className="grid gap-2.5">
              <Button
                className="bg-sidebar-primary text-sidebar-primary-foreground w-full shadow-none"
                size="sm"
              >
                <MessageCircleQuestionMark />
                Learn more
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </SidebarGroup>
  );
}
