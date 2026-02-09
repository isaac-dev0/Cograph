import { AlertCircle, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "./button";

interface ErrorMessageProps {
  title?: string;
  message: string;
  variant?: "error" | "warning" | "info";
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

const VARIANT_STYLES = {
  error: {
    icon: XCircle,
    containerClass: "border-destructive/20 bg-destructive/10",
    iconClass: "text-destructive",
    titleClass: "text-destructive",
    role: "alert" as const,
  },
  warning: {
    icon: AlertTriangle,
    containerClass: "border-yellow-500/20 bg-yellow-500/10",
    iconClass: "text-yellow-500",
    titleClass: "text-yellow-600 dark:text-yellow-500",
    role: "status" as const,
  },
  info: {
    icon: AlertCircle,
    containerClass: "border-blue-500/20 bg-blue-500/10",
    iconClass: "text-blue-500",
    titleClass: "text-blue-600 dark:text-blue-500",
    role: "status" as const,
  },
};

export function ErrorMessage({
  title,
  message,
  variant = "error",
  onRetry,
  retryLabel = "Try Again",
  className = "",
}: ErrorMessageProps) {
  const config = VARIANT_STYLES[variant];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-lg border p-4 ${config.containerClass} ${className}`}
      role={config.role}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${config.iconClass}`} aria-hidden="true" />
        <div className="flex-1 space-y-2">
          {title && (
            <h3 className={`text-sm font-semibold ${config.titleClass}`}>
              {title}
            </h3>
          )}
          <p className="text-sm text-muted-foreground">{message}</p>
          {onRetry && (
            <Button
              onClick={onRetry}
              size="sm"
              variant="outline"
              className="mt-3"
              aria-label={`${retryLabel} - ${title || message}`}
            >
              {retryLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
