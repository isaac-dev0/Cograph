import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/ui/icons/github-icon";
import { loginWithGithub } from "@/app/auth/login/actions";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("w-full", className)} {...props}>
      <Button
        variant="outline"
        type="button"
        onClick={loginWithGithub}
        className="w-full h-11 gap-2.5 glass text-sm font-medium transition-all hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]"
      >
        <GithubIcon />
        Continue with GitHub
      </Button>
    </div>
  );
}
