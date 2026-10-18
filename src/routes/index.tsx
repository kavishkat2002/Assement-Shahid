import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, MapPin, Receipt, Headphones, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { getCategories, searchVehicles } from "@/services/vehicles";
import { SearchBar } from "@/components/site/SearchBar";
import { VehicleCard } from "@/components/site/VehicleCard";
import { InquiryForm } from "@/components/site/InquiryForm";
import { EmptyState, ErrorState, LoadingState } from "@/components/site/common";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SwiftDrive Rentals — Car rental in Negombo, Sri Lanka" },
      { name: "description", content: "Search and book economy cars, SUVs, vans and luxury vehicles from Negombo with clear LKR pricing." },
      { property: "og:title", content: "SwiftDrive Rentals — Car rental in Negombo" },
      { property: "og:description", content: "Search and book economy cars, SUVs, vans and luxury vehicles with clear LKR pricing." },
    ],
  }),
  component: Home,
});

const FAQ = [
  { q: "What do I need to rent a vehicle?", a: "A valid driving licence (or International Driving Permit for visitors), a national ID or passport, and the security deposit shown on the vehicle page." },
  { q: "When is my booking confirmed?", a: "Your request is saved as pending straight away. Our team checks it and confirms it — you can see the status in your account at any time." },
  { q: "How is the price calculated?", a: "Rental days are counted from pickup date to return date. If a weekly rate is configured, each full week uses it and extra days use the daily rate. The deposit is shown separately." },
  { q: "Can I cancel?", a: "Yes. The cancellation window is set in our rental terms. You can cancel or request cancellation from your account." },
  { q: "How do I pay?", a: "Payments are currently taken in person at pickup (cash, card terminal or bank transfer) and recorded by our staff. Online payment is not yet available." },
];

function Home() {
  const cats = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const featured = useQuery({ queryKey: ["vehicles", "featured"], queryFn: () => searchVehicles({ sort: "newest", page: 1 }) });
  const reviews = useQuery({
    queryKey: ["reviews", "home"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("id, rating, comment, display_name, created_at").eq("is_published", true).order("created_at", { ascending: false }).limit(3);
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <section className="relative isolate">
        <img src="/images/hero.jpg" alt="Coastal road along the Negombo lagoon" width={1920} height={1088} className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="hero-scrim absolute inset-0 -z-10" aria-hidden />
        <div className="container-page pb-10 pt-16 sm:pt-24">
          <div className="max-w-xl text-navy-foreground">
            <p className="text-sm font-semibold uppercase tracking-wider opacity-90">Negombo · Sri Lanka</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">Reliable vehicles for every journey across Sri Lanka</h1>
            <p className="mt-4 text-base opacity-90 sm:text-lg">Economy cars, SUVs, vans and luxury vehicles — check real availability and see the full price before you book.</p>
          </div>
          <div className="mt-10"><SearchBar /></div>
        </div>
      </section>

      <section className="container-page py-14" aria-labelledby="cats">
        <h2 id="cats" className="text-2xl font-bold">Choose a vehicle type</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cats.data?.map((c) => (
            <Link key={c.id} to="/vehicles" search={{ category: c.slug }} className="group overflow-hidden rounded-lg border bg-card">
              <img src={`/images/${c.slug}.jpg`} alt="" loading="lazy" width={600} height={400} className="aspect-[3/2] w-full object-cover" />
              <div className="p-4">
                <p className="font-semibold group-hover:text-primary">{c.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-card py-14" aria-labelledby="fleet">
        <div className="container-page">
          <div className="flex items-end justify-between gap-4">
            <h2 id="fleet" className="text-2xl font-bold">Available vehicles</h2>
            <Link to="/vehicles" className="text-sm font-semibold text-primary hover:underline">See all vehicles</Link>
          </div>
          <div className="mt-6">
            {featured.isLoading ? <LoadingState /> : featured.error ? <ErrorState message="We couldn't load vehicles." onRetry={() => featured.refetch()} /> :
              featured.data!.vehicles.length === 0 ? <EmptyState title="No vehicles listed yet" /> : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {featured.data!.vehicles.slice(0, 6).map((v) => <VehicleCard key={v.id} v={v} />)}
                </div>
              )}
          </div>
        </div>
      </section>

      <section className="container-page py-14" aria-labelledby="why">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 id="why" className="text-2xl font-bold">Why SwiftDrive</h2>
            <p className="mt-3 text-muted-foreground">A local rental team in Negombo, close to Bandaranaike International Airport, focused on clear pricing and well-kept vehicles.</p>
          </div>
          <ul className="grid gap-6 sm:grid-cols-2">
            {[
              { icon: Receipt, t: "Transparent pricing", d: "Rental, deposit and any configured charges are shown before you book." },
              { icon: ShieldCheck, t: "Real availability", d: "Dates are checked against existing reservations, not just a status flag." },
              { icon: MapPin, t: "Convenient pickup", d: "Collect in Negombo town or near the airport." },
              { icon: Headphones, t: "Local support", d: "Send us an inquiry and track the reply in your account." },
            ].map(({ icon: Icon, t, d }) => (
              <li key={t} className="flex gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div><p className="font-semibold">{t}</p><p className="text-sm text-muted-foreground">{d}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-card py-14" aria-labelledby="reviews">
        <div className="container-page">
          <h2 id="reviews" className="text-2xl font-bold">Customer reviews</h2>
          <div className="mt-6">
            {reviews.isLoading ? <LoadingState /> : reviews.error ? <ErrorState message="Reviews couldn't be loaded." onRetry={() => reviews.refetch()} /> :
              reviews.data!.length === 0 ? <EmptyState title="No reviews yet" description="Reviews appear here once customers complete a rental and share their experience." /> : (
                <div className="grid gap-5 md:grid-cols-3">
                  {reviews.data!.map((r) => (
                    <figure key={r.id} className="rounded-lg border p-5">
                      <div className="flex gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                        {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={i < r.rating ? "h-4 w-4 fill-primary text-primary" : "h-4 w-4 text-border"} aria-hidden />)}
                      </div>
                      <blockquote className="mt-3 text-sm">{r.comment}</blockquote>
                      <figcaption className="mt-3 text-xs text-muted-foreground">{r.display_name} · {formatDate(r.created_at)}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
          </div>
        </div>
      </section>

      <section className="container-page grid gap-10 py-14 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-4">
            {FAQ.map((f, i) => (
              <AccordionItem key={i} value={`f${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        <div>
          <h2 className="text-2xl font-bold">Ask us anything</h2>
          <p className="mt-2 text-muted-foreground">Questions about a rental, long-term hire or group transport? Send us a message.</p>
          <div className="mt-6"><InquiryForm /></div>
        </div>
      </section>

      <section className="container-page">
        <div className="flex flex-col items-start gap-4 rounded-lg bg-navy p-8 text-navy-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Ready to plan your trip?</h2>
            <p className="mt-1 opacity-85">Browse the fleet and reserve in a few minutes.</p>
          </div>
          <Button asChild size="lg"><Link to="/vehicles">Browse vehicles</Link></Button>
        </div>
      </section>
    </>
  );
}
