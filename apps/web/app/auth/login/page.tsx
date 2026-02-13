import { LoginForm } from "@/components/auth/AuthForm";
import { GitGraph } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--glow)_0%,transparent_70%)]" />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-10 px-6 animate-slide-up">
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <GitGraph className="size-5" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight">Cograph</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Dependency intelligence for engineering teams
            </p>
          </div>
        </div>

        <LoginForm />

        <p className="text-center text-xs text-muted-foreground/60">
          By continuing, you agree to our{" "}
          <a
            href="#"
            className="underline underline-offset-4 hover:text-muted-foreground transition-colors"
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href="#"
            className="underline underline-offset-4 hover:text-muted-foreground transition-colors"
          >
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
