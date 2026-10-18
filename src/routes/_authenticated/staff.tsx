import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/site/common";
import { RoleGate } from "@/components/site/RoleGate";
import { BookingOps } from "@/components/staff/BookingOps";
import { InquiryOps } from "@/components/staff/InquiryOps";
import { AuditList } from "@/components/staff/AuditList";
import { todayColombo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({ meta: [
    { title: "Staff dashboard — SwiftDrive Rentals" },
    { name: "description", content: "Reservations, handovers, returns and inquiries." },
    { property: "og:title", content: "Staff dashboard — SwiftDrive Rentals" },
    { property: "og:description", content: "Reservations, handovers, returns and inquiries." },
  ] }),
  component: () => <RoleGate need="staff"><Staff /></RoleGate>,
});

function Staff() {
  const today = todayColombo();
  const counts = useQuery({
    queryKey: ["staff-counts", today],
    queryFn: async () => {
      const c = async (q: any) => (await q).count ?? 0;
      const base = () => supabase.from("bookings").select("id", { count: "exact", head: true });
      return {
        pending: await c(base().eq("status", "pending")),
        pickupsToday: await c(base().eq("status", "confirmed").eq("pickup_date", today)),
        returnsToday: await c(base().eq("status", "active").eq("return_date", today)),
        overdue: await c(base().eq("status", "active").lt("return_date", today)),
        inquiries: await c(supabase.from("rental_inquiries").select("id", { count: "exact", head: true }).eq("status", "open")),
      };
    },
  });
  const items = [
    ["Pending reservations", counts.data?.pending], ["Pickups today", counts.data?.pickupsToday], ["Returns due today", counts.data?.returnsToday],
    ["Overdue returns", counts.data?.overdue], ["Open inquiries", counts.data?.inquiries],
  ] as const;
  return (
    <>
      <PageHeader title="Staff dashboard" description="Today's operations and reservations." />
      <div className="container-page py-8">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {items.map(([l, v]) => <div key={l} className="rounded-lg border bg-card p-4"><dt className="text-xs text-muted-foreground">{l}</dt><dd className="mt-1 text-2xl font-bold">{v ?? "–"}</dd></div>)}
        </dl>
        <Tabs defaultValue="bookings" className="mt-8">
          <TabsList><TabsTrigger value="bookings">Reservations</TabsTrigger><TabsTrigger value="inquiries">Inquiries</TabsTrigger><TabsTrigger value="audit">Activity log</TabsTrigger></TabsList>
          <TabsContent value="bookings" className="mt-6"><BookingOps /></TabsContent>
          <TabsContent value="inquiries" className="mt-6"><InquiryOps /></TabsContent>
          <TabsContent value="audit" className="mt-6"><AuditList /></TabsContent>
        </Tabs>
      </div>
    </>
  );
}
