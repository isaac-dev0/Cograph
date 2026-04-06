"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/ui/icons/github-icon";
import { Loader2 } from "lucide-react";
import { loginWithGithub } from "@/app/auth/login/actions";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGithub();
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("w-full", className)} {...props}>
      <Button
        variant="outline"
        type="button"
        onClick={handleLogin}
        disabled={isLoading}
        className="w-full h-11 gap-2.5 glass text-sm font-medium transition-all hover:shadow-lg hover:shadow-primary/5 motion-safe:active:scale-[0.98]"
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <GithubIcon />
        )}
        {isLoading ? "Redirecting..." : "Continue with GitHub"}
      </Button>
    </div>
  );
}
