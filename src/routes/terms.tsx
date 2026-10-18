import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPolicies } from "@/services/vehicles";
import { ErrorState, LoadingState, PageHeader } from "@/components/site/common";
import { formatLKR } from "@/lib/format";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [
    { title: "Rental terms and conditions — SwiftDrive Rentals" },
    { name: "description", content: "Deposits, cancellation, pricing rules and driver requirements for SwiftDrive rentals." },
    { property: "og:title", content: "Rental terms — SwiftDrive Rentals" },
    { property: "og:description", content: "Deposits, cancellation and pricing rules." },
  ] }),
  component: Terms,
});

function Terms() {
  const p = useQuery({ queryKey: ["policies"], queryFn: getPolicies });
  return (
    <>
      <PageHeader title="Rental terms and conditions" description="These terms are loaded from the policies configured by our administrators." />
      <div className="container-page max-w-3xl py-10">
        {p.isLoading ? <LoadingState /> : p.error || !p.data ? <ErrorState message="Terms couldn't be loaded." onRetry={() => p.refetch()} /> : (
          <div className="space-y-8">
            <p className="rounded-md bg-warning-soft p-3 text-sm text-warning">These are demonstration terms for an academic project and are not legal advice.</p>
            <Section title="1. Pricing">
              <p>Rental days are counted from the pickup date to the return date. Where a weekly rate is configured, each full 7 days is charged at the weekly rate and remaining days at the daily rate. All prices are in Sri Lankan Rupees (LKR) and are calculated by our system at the time of booking.</p>
              <p>Rental length: minimum {p.data.min_rental_days} day(s), maximum {p.data.max_rental_days} days.</p>
            </Section>
            <Section title="2. Security deposit">
              <p>{p.data.deposit_terms}</p>
              <p>Default deposit where a vehicle has no specific amount: {formatLKR(p.data.default_deposit_lkr)}.</p>
            </Section>
            <Section title="3. Cancellation">
              <p>{p.data.cancellation_terms}</p>
              <p>Free cancellation window: {p.data.free_cancellation_hours} hours before pickup.</p>
            </Section>
            <Section title="4. Additional charges">
              <p>Late return fee per day: {Number(p.data.late_return_fee_per_day_lkr) > 0 ? formatLKR(p.data.late_return_fee_per_day_lkr) : "not configured"}.</p>
              <p>Additional driver fee: {Number(p.data.additional_driver_fee_lkr) > 0 ? formatLKR(p.data.additional_driver_fee_lkr) : "not configured"}.</p>
            </Section>
            <Section title="5. Payment">
              <p>Bookings are not paid online. Payments are taken at pickup and recorded by our staff, and your account shows each recorded payment and any balance outstanding.</p>
            </Section>
            <Section title="6. Driver requirements">
              <p>Drivers must hold a valid Sri Lankan driving licence or an International Driving Permit recognised in Sri Lanka, and present a national ID or passport at pickup.</p>
            </Section>
          </div>
        )}
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="text-lg font-semibold">{title}</h2><div className="mt-2 space-y-2 text-muted-foreground">{children}</div></section>;
}
