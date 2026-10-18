import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { EmptyState, ErrorState, LoadingState, StatusBadge, selectClass } from "@/components/site/common";
import { formatDateTime, friendlyError } from "@/lib/format";

export function InquiryOps() {
  const [status, setStatus] = useState("open");
  const q = useQuery({
    queryKey: ["staff-inquiries", status],
    queryFn: async () => {
      let query = supabase.from("rental_inquiries").select("*").order("created_at", { ascending: false }).limit(100);
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
  return (
    <div>
      <select aria-label="Filter inquiries" className={selectClass + " mb-4 w-48"} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="open">Open</option><option value="responded">Responded</option><option value="closed">Closed</option><option value="">All</option>
      </select>
      {q.isLoading ? <LoadingState /> : q.error ? <ErrorState message={friendlyError(q.error)} onRetry={() => q.refetch()} /> :
        q.data!.length === 0 ? <EmptyState title="No inquiries here" /> : <ul className="space-y-3">{q.data!.map((i) => <InquiryItem key={i.id} i={i} />)}</ul>}
    </div>
  );
}

function InquiryItem({ i }: { i: any }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reply, setReply] = useState(i.staff_response ?? "");
  async function save(newStatus: "responded" | "closed") {
    if (newStatus === "responded" && reply.trim().length < 2) return void toast.error("Please write a reply.");
    const { error } = await supabase.from("rental_inquiries").update({ staff_response: reply.trim() || null, status: newStatus, responded_by: user!.id, responded_at: new Date().toISOString() }).eq("id", i.id);
    if (error) return void toast.error(friendlyError(error));
    toast.success(newStatus === "responded" ? "Reply saved. Signed-in customers see it in their account." : "Inquiry closed.");
    qc.invalidateQueries({ queryKey: ["staff-inquiries"] });
  }
  return (
    <li className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2"><StatusBadge status={i.status} /><span className="font-medium">{i.name}</span><a className="text-sm text-primary" href={`mailto:${i.email}`}>{i.email}</a>{i.phone && <span className="text-sm text-muted-foreground">{i.phone}</span>}<span className="text-xs text-muted-foreground">{formatDateTime(i.created_at)} · {i.category.replace("_", " ")}</span></div>
      <p className="mt-2 text-sm">{i.message}</p>
      <Textarea aria-label="Reply" className="mt-3" rows={2} placeholder="Write a reply (also email the customer directly if they aren't registered)" value={reply} onChange={(e) => setReply(e.target.value)} />
      <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => save("responded")}>Save reply</Button><Button size="sm" variant="outline" onClick={() => save("closed")}>Close</Button></div>
    </li>
  );
}
