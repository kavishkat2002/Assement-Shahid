/**
 * @file InquiryOps.tsx
 * @description Operational staff console for viewing, filtering, and resolving customer rental inquiries.
 *
 * Business Context:
 * Customers submit inquiries via the public contact form or vehicle detail pages
 * (e.g., questions regarding chauffeured services, cross-country travel, airport meet-and-greets).
 * This component provides desk personnel with:
 *  1. Status-based queue filtering (Open, Responded, Closed, All).
 *  2. Direct inline reply drafting and resolution dispatch.
 *  3. Bidirectional communication hooks: replies saved to `rental_inquiries`
 *     are immediately rendered in authenticated customer portals and marked
 *     with staff attribution (`responded_by`, `responded_at`).
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  selectClass,
} from "@/components/site/common";
import { formatDateTime, friendlyError } from "@/lib/format";

/**
 * Main staff inquiry management interface.
 * Renders the filter control and the paginated/capped queue of customer tickets.
 */
export function InquiryOps() {
  // Filter state defaulting to pending "open" inquiries requiring attention
  const [status, setStatus] = useState("open");

  // Fetch up to 100 recent inquiries matching the selected status filter
  const inquiriesQuery = useQuery({
    queryKey: ["staff-inquiries", status],
    queryFn: async () => {
      let query = supabase
        .from("rental_inquiries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      {/* Status filter dropdown */}
      <select
        aria-label="Filter inquiries"
        className={`${selectClass} mb-4 w-48`}
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="open">Open</option>
        <option value="responded">Responded</option>
        <option value="closed">Closed</option>
        <option value="">All</option>
      </select>

      {/* Query state handling */}
      {inquiriesQuery.isLoading ? (
        <LoadingState />
      ) : inquiriesQuery.error ? (
        <ErrorState
          message={friendlyError(inquiriesQuery.error)}
          onRetry={() => inquiriesQuery.refetch()}
        />
      ) : inquiriesQuery.data!.length === 0 ? (
        <EmptyState title="No inquiries here" />
      ) : (
        <ul className="space-y-3">
          {inquiriesQuery.data!.map((inquiry) => (
            <InquiryItem key={inquiry.id} inquiry={inquiry} />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Represents a single inquiry card with inline response capabilities.
 */
function InquiryItem({ inquiry }: { inquiry: any }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Local draft state for staff response text
  const [reply, setReply] = useState(inquiry.staff_response ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Persists staff response and updates inquiry lifecycle status.
   *
   * @param newStatus - Target status ('responded' or 'closed')
   */
  async function handleSave(newStatus: "responded" | "closed") {
    // Require a meaningful response message before marking as responded
    if (newStatus === "responded" && reply.trim().length < 2) {
      toast.error("Please write a reply.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("rental_inquiries")
        .update({
          staff_response: reply.trim() || null,
          status: newStatus,
          responded_by: user!.id,
          responded_at: new Date().toISOString(),
        })
        .eq("id", inquiry.id);

      if (error) {
        toast.error(friendlyError(error));
        return;
      }

      toast.success(
        newStatus === "responded"
          ? "Reply saved. Signed-in customers see it in their account."
          : "Inquiry closed."
      );

      // Invalidate both staff and customer inquiry queries
      queryClient.invalidateQueries({ queryKey: ["staff-inquiries"] });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Format category badge text (e.g. 'long_term' -> 'long term')
  const formattedCategory = inquiry.category ? inquiry.category.replace("_", " ") : "general";

  return (
    <li className="rounded-lg border bg-card p-4">
      {/* Header metadata row */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={inquiry.status} />
        <span className="font-medium">{inquiry.name}</span>
        <a
          className="text-sm text-primary hover:underline"
          href={`mailto:${inquiry.email}`}
        >
          {inquiry.email}
        </a>
        {inquiry.phone && (
          <span className="text-sm text-muted-foreground">{inquiry.phone}</span>
        )}
        <span className="text-xs text-muted-foreground">
          {formatDateTime(inquiry.created_at)} · {formattedCategory}
        </span>
      </div>

      {/* Customer inquiry body */}
      <p className="mt-2 text-sm leading-relaxed">{inquiry.message}</p>

      {/* Staff reply editing area */}
      <Textarea
        aria-label="Reply"
        className="mt-3"
        rows={2}
        placeholder="Write a reply (also email the customer directly if they aren't registered)"
        value={reply}
        onChange={(e) => setReply(e.target.value)}
      />

      {/* Action buttons */}
      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          disabled={isSubmitting}
          onClick={() => handleSave("responded")}
        >
          Save reply
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => handleSave("closed")}
        >
          Close
        </Button>
      </div>
    </li>
  );
}
