import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, ErrorState, LoadingState } from "@/components/site/common";
import { formatDateTime, friendlyError } from "@/lib/format";

export function AuditList() {
  const q = useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });
  if (q.isLoading) return <LoadingState />;
  if (q.error) return <ErrorState message={friendlyError(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data!.length) return <EmptyState title="No activity recorded yet" />;
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary text-left"><tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Details</th></tr></thead>
        <tbody>
          {q.data!.map((a) => (
            <tr key={a.id} className="border-t align-top">
              <td className="whitespace-nowrap px-3 py-2">{formatDateTime(a.created_at)}</td>
              <td className="px-3 py-2 font-medium">{a.action}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{Object.entries((a.details ?? {}) as Record<string, unknown>).filter(([, v]) => v !== null && v !== "").map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
