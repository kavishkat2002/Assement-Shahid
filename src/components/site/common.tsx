import type { ReactNode } from "react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="border-b bg-card">
      <div className="container-page flex flex-col gap-4 py-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-muted-foreground">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-danger-soft px-6 py-10 text-center">
      <AlertCircle className="h-6 w-6 text-destructive" aria-hidden />
      <p className="text-sm">{message}</p>
      {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-card px-6 py-12 text-center">
      <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden />
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning-soft text-warning",
  confirmed: "bg-accent text-accent-foreground",
  active: "bg-navy text-navy-foreground",
  completed: "bg-success-soft text-success",
  cancelled: "bg-secondary text-muted-foreground",
  rejected: "bg-danger-soft text-destructive",
  open: "bg-warning-soft text-warning",
  responded: "bg-success-soft text-success",
  closed: "bg-secondary text-muted-foreground",
  succeeded: "bg-success-soft text-success",
  failed: "bg-danger-soft text-destructive",
  overdue: "bg-danger-soft text-destructive",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", STATUS_STYLES[status] ?? "bg-secondary", className)}>
      {status.replace("_", " ")}
    </span>
  );
}

export function DemoBadge() {
  return <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Demo</span>;
}

export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string | undefined; hint?: string | undefined; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={`${htmlFor}-error`} role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
