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

/**
 * ============================================================================
 * Staff Operations Dashboard Route (/staff)
 * ============================================================================
 * Internal operational portal used by counter staff at the Negombo branch.
 * Provides high-level operational counts for the current workday, reservation
 * dispatch/handover controls, inquiry resolution, and system activity logs.
 *
 * Security: Wrapped in <RoleGate need="staff"> which validates that the user
 * holds either 'staff' or 'admin' role in public.user_roles.
 */
export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "Staff dashboard — SwiftDrive Rentals" },
      { name: "description", content: "Reservations, handovers, returns and inquiries." },
      { property: "og:title", content: "Staff dashboard — SwiftDrive Rentals" },
      { property: "og:description", content: "Reservations, handovers, returns and inquiries." },
    ],
  }),
  component: () => (
    <RoleGate need="staff">
      <Staff />
    </RoleGate>
  ),
});

function Staff() {
  const today = todayColombo();

  // Aggregate daily operational metrics in parallel using Supabase exact head queries
  const counts = useQuery({
    queryKey: ["staff-counts", today],
    queryFn: async () => {
      const getCount = async (q: any) => (await q).count ?? 0;
      const base = () =>
        supabase.from("bookings").select("id", { count: "exact", head: true });

      return {
        // Pending reservations awaiting staff confirmation
        pending: await getCount(base().eq("status", "pending")),
        // Confirmed rentals scheduled for customer pickup today
        pickupsToday: await getCount(
          base().eq("status", "confirmed").eq("pickup_date", today)
        ),
        // Active rentals scheduled for vehicle return today
        returnsToday: await getCount(
          base().eq("status", "active").eq("return_date", today)
        ),
        // Active rentals whose return date has passed without recorded handover
        overdue: await getCount(
          base().eq("status", "active").lt("return_date", today)
        ),
        // Unresolved customer inquiries
        inquiries: await getCount(
          supabase
            .from("rental_inquiries")
            .select("id", { count: "exact", head: true })
            .eq("status", "open")
        ),
      };
    },
  });

  const items = [
    ["Pending reservations", counts.data?.pending],
    ["Pickups today", counts.data?.pickupsToday],
    ["Returns due today", counts.data?.returnsToday],
    ["Overdue returns", counts.data?.overdue],
    ["Open inquiries", counts.data?.inquiries],
  ] as const;

  return (
    <>
      <PageHeader
        title="Staff dashboard"
        description="Today's operations and reservations."
      />

      <div className="container-page py-8">
        {/* Metric Summary Cards */}
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {items.map(([label, value]) => (
            <div key={label} className="rounded-lg border bg-card p-4">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-2xl font-bold">{value ?? "–"}</dd>
            </div>
          ))}
        </dl>

        {/* Tabbed Operations Panels */}
        <Tabs defaultValue="bookings" className="mt-8">
          <TabsList>
            <TabsTrigger value="bookings">Reservations</TabsTrigger>
            <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
            <TabsTrigger value="audit">Activity log</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="mt-6">
            <BookingOps />
          </TabsContent>

          <TabsContent value="inquiries" className="mt-6">
            <InquiryOps />
          </TabsContent>

          <TabsContent value="audit" className="mt-6">
            <AuditList />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

