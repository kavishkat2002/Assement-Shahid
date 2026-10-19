/**
 * @file AuditList.tsx
 * @description Operational staff view for reviewing immutable system audit logs.
 *
 * Audit Trail Architecture:
 * - High-privilege state changes (vehicle additions, booking overrides, customer status updates,
 *   role assignments) record structured records in the `audit_logs` table.
 * - This component renders the latest 100 chronological audit events, dynamically parsing
 *   and displaying the JSON payload of changes for forensic analysis and compliance verification.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, ErrorState, LoadingState } from "@/components/site/common";
import { formatDateTime, friendlyError } from "@/lib/format";

/**
 * System audit log explorer component.
 * Displays a tabular view of chronological operations and their contextual key-value details.
 */
export function AuditList() {
  const auditQuery = useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  if (auditQuery.isLoading) {
    return <LoadingState />;
  }

  if (auditQuery.error) {
    return (
      <ErrorState
        message={friendlyError(auditQuery.error)}
        onRetry={() => auditQuery.refetch()}
      />
    );
  }

  if (!auditQuery.data || auditQuery.data.length === 0) {
    return <EmptyState title="No activity recorded yet" />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary text-left">
          <tr>
            <th className="px-3 py-2 font-semibold">When</th>
            <th className="px-3 py-2 font-semibold">Action</th>
            <th className="px-3 py-2 font-semibold">Details</th>
          </tr>
        </thead>
        <tbody>
          {auditQuery.data.map((auditEntry) => {
            // Extract and format non-empty key-value pairs from the JSON details object
            const detailsMap = (auditEntry.details ?? {}) as Record<string, unknown>;
            const formattedDetails = Object.entries(detailsMap)
              .filter(([, val]) => val !== null && val !== "" && val !== undefined)
              .map(([key, val]) => `${key}: ${String(val)}`)
              .join(" · ");

            return (
              <tr key={auditEntry.id} className="border-t align-top hover:bg-muted/40 transition-colors">
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                  {formatDateTime(auditEntry.created_at)}
                </td>
                <td className="px-3 py-2 font-medium">
                  {auditEntry.action}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground font-mono">
                  {formattedDetails || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
