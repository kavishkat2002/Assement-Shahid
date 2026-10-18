import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/site/common";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [
    { title: "About SwiftDrive Rentals — Negombo, Sri Lanka" },
    { name: "description", content: "A Negombo-based rental company offering economy cars, SUVs, vans and luxury vehicles." },
    { property: "og:title", content: "About SwiftDrive Rentals" },
    { property: "og:description", content: "A Negombo-based rental company offering cars, SUVs, vans and luxury vehicles." },
  ] }),
  component: About,
});

function About() {
  return (
    <>
      <PageHeader title="About SwiftDrive Rentals" description="Vehicle rentals from Negombo, close to Bandaranaike International Airport." />
      <div className="container-page grid gap-10 py-10 lg:grid-cols-2">
        <div className="space-y-4 text-muted-foreground">
          <p>SwiftDrive Rentals provides self-drive vehicles for visitors, families and businesses travelling around Sri Lanka. Our fleet covers four categories — economy cars, SUVs, vans and luxury vehicles — so you can choose what suits your trip.</p>
          <p>We aim to keep renting simple: you can see real availability for your dates, the full rental cost and the security deposit before you book, and follow your booking status in your account.</p>
          <p>Our team handles every handover in person, records the vehicle's condition at pickup and return, and is available to answer questions through our inquiry form.</p>
          <p className="text-xs">This page describes the SwiftDrive Rentals project. Company history and staff details should be added by the business owner.</p>
          <Button asChild><Link to="/vehicles">Browse vehicles</Link></Button>
        </div>
        <img src="/images/suv.jpg" alt="SwiftDrive SUV on a hill country road" loading="lazy" width={1200} height={800} className="rounded-lg border object-cover" />
      </div>
    </>
  );
}
