/**
 * SwiftDrive Rentals — Homepage Route (/)
 *
 * The primary public landing page featuring:
 *  - Hero banner with quick vehicle date & location search
 *  - Categorized vehicle types (Economy, SUV, Van, Luxury)
 *  - Real-time featured fleet listings
 *  - Value propositions & local service highlights (Negombo & airport proximity)
 *  - Verified customer reviews
 *  - Frequently Asked Questions accordion
 *  - Direct general inquiry contact form
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, MapPin, Receipt, Headphones, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
      {
        name: "description",
        content:
          "Search and book economy cars, SUVs, vans and luxury vehicles from Negombo with clear LKR pricing and airport pickup.",
      },
      { property: "og:title", content: "SwiftDrive Rentals — Car rental in Negombo" },
      {
        property: "og:description",
        content:
          "Search and book economy cars, SUVs, vans and luxury vehicles with clear LKR pricing and airport pickup.",
      },
    ],
  }),
  component: Home,
});

/**
 * Common questions regarding rental requirements, payment terms, and vehicle deposits.
 */
const FREQUENT_QUESTIONS = [
  {
    q: "What do I need to rent a vehicle?",
    a: "A valid Sri Lankan driving licence (or International Driving Permit for overseas visitors), a national ID or passport, and the refundable security deposit specified for the vehicle.",
  },
  {
    q: "When is my booking confirmed?",
    a: "Your reservation is initially recorded with 'pending' status. Our operations team reviews vehicle schedule availability and confirms it — you can check the live status in your account at any time.",
  },
  {
    q: "How is the price calculated?",
    a: "Rental charges are computed from the pickup date to the return date. If a weekly discount rate applies, each full 7-day period is charged at the weekly rate with extra days charged at the daily rate. Security deposits are listed separately.",
  },
  {
    q: "Can I cancel my reservation?",
    a: "Yes. In accordance with our rental policy, cancellations made well before the pickup date are handled without penalty. You can request cancellation directly from your account portal.",
  },
  {
    q: "How do I pay?",
    a: "Payments are collected in person upon vehicle handover at pickup (cash, credit/debit card terminal, or local bank transfer) and recorded directly by our staff. Online credit card processing is currently not required.",
  },
];

function Home() {
  // Query vehicle categories (Economy, SUV, Van, Luxury)
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  // Query top featured vehicles sorted by newest additions
  const featuredVehiclesQuery = useQuery({
    queryKey: ["vehicles", "featured"],
    queryFn: () => searchVehicles({ sort: "newest", page: 1 }),
  });

  // Query published customer reviews for the testimonials showcase
  const reviewsQuery = useQuery({
    queryKey: ["reviews", "home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, display_name, created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      {/* 1. Hero Search Section */}
      <section className="relative isolate">
        <img
          src="/images/hero.jpg"
          alt="Scenic coastal road in Negombo, Sri Lanka"
          width={1920}
          height={1088}
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="hero-scrim absolute inset-0 -z-10" aria-hidden />

        <div className="container-page pb-10 pt-16 sm:pt-24">
          <div className="max-w-xl text-navy-foreground">
            <p className="text-sm font-semibold uppercase tracking-wider opacity-90">
              Negombo · Sri Lanka
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
              Reliable vehicles for every journey across Sri Lanka
            </h1>
            <p className="mt-4 text-base opacity-90 sm:text-lg">
              Economy cars, family SUVs, passenger vans, and luxury sedans — check live availability and transparent rates before you book.
            </p>
          </div>

          <div className="mt-10">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* 2. Vehicle Category Grid */}
      <section className="container-page py-14" aria-labelledby="category-heading">
        <h2 id="category-heading" className="text-2xl font-bold tracking-tight text-foreground">
          Choose a vehicle type
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categoriesQuery.data?.map((cat) => (
            <Link
              key={cat.id}
              to="/vehicles"
              search={{ category: cat.slug }}
              className="group overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md"
            >
              <img
                src={`/images/${cat.slug}.jpg`}
                alt=""
                loading="lazy"
                width={600}
                height={400}
                className="aspect-[3/2] w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="p-4">
                <p className="font-semibold text-foreground group-hover:text-primary">
                  {cat.name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{cat.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Featured Fleet Showcase */}
      <section className="bg-card py-14" aria-labelledby="fleet-heading">
        <div className="container-page">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="fleet-heading" className="text-2xl font-bold tracking-tight text-foreground">
                Available vehicles
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Inspected, serviced, and ready for immediate reservation.
              </p>
            </div>
            <Link to="/vehicles" className="text-sm font-semibold text-primary hover:underline">
              View all vehicles →
            </Link>
          </div>

          <div className="mt-6">
            {featuredVehiclesQuery.isLoading ? (
              <LoadingState label="Loading featured vehicles…" />
            ) : featuredVehiclesQuery.error ? (
              <ErrorState
                message="We were unable to load the vehicle fleet. Please check your connection."
                onRetry={() => featuredVehiclesQuery.refetch()}
              />
            ) : featuredVehiclesQuery.data?.vehicles.length === 0 ? (
              <EmptyState title="No vehicles currently listed" />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featuredVehiclesQuery.data?.vehicles.slice(0, 6).map((vehicle) => (
                  <VehicleCard key={vehicle.id} v={vehicle} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Why SwiftDrive Value Propositions */}
      <section className="container-page py-14" aria-labelledby="why-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <h2 id="why-heading" className="text-2xl font-bold tracking-tight text-foreground">
              Why choose SwiftDrive
            </h2>
            <p className="mt-3 text-muted-foreground">
              Based conveniently in Negombo, minutes away from Bandaranaike International Airport (CMB).
              We combine transparent pricing in Sri Lankan Rupees with personalized customer service and well-maintained vehicles.
            </p>
          </div>

          <ul className="grid gap-6 sm:grid-cols-2">
            {[
              {
                icon: Receipt,
                title: "Transparent pricing",
                desc: "Rental rates, security deposits, and optional fees are clearly presented with zero hidden charges.",
              },
              {
                icon: ShieldCheck,
                title: "Guaranteed availability",
                desc: "Dates are validated against actual confirmed reservations, avoiding double-booking disappointments.",
              },
              {
                icon: MapPin,
                title: "Airport & town pickup",
                desc: "Flexible handover locations in Negombo town center or directly outside the arrivals terminal.",
              },
              {
                icon: Headphones,
                title: "Dedicated support",
                desc: "Our local staff is available to assist you throughout your rental period across Sri Lanka.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="font-semibold text-foreground">{title}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. Customer Reviews */}
      <section className="bg-card py-14" aria-labelledby="reviews-heading">
        <div className="container-page">
          <h2 id="reviews-heading" className="text-2xl font-bold tracking-tight text-foreground">
            Customer experiences
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Read authentic feedback from travelers who rented with SwiftDrive.
          </p>

          <div className="mt-6">
            {reviewsQuery.isLoading ? (
              <LoadingState label="Loading customer reviews…" />
            ) : reviewsQuery.error ? (
              <ErrorState
                message="Reviews could not be loaded at this time."
                onRetry={() => reviewsQuery.refetch()}
              />
            ) : !reviewsQuery.data || reviewsQuery.data.length === 0 ? (
              <EmptyState
                title="No customer reviews yet"
                description="Verified reviews will appear here once renters complete their journeys."
              />
            ) : (
              <div className="grid gap-5 md:grid-cols-3">
                {reviewsQuery.data.map((review) => (
                  <figure key={review.id} className="rounded-lg border bg-background p-5 shadow-sm">
                    <div className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={
                            idx < review.rating
                              ? "h-4 w-4 fill-primary text-primary"
                              : "h-4 w-4 text-border"
                          }
                          aria-hidden
                        />
                      ))}
                    </div>
                    <blockquote className="mt-3 text-sm italic text-foreground">
                      "{review.comment}"
                    </blockquote>
                    <figcaption className="mt-4 text-xs font-medium text-muted-foreground">
                      {review.display_name} · {formatDate(review.created_at)}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6. FAQ & Quick Inquiry Form */}
      <section className="container-page grid gap-10 py-14 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Frequently asked questions
          </h2>
          <Accordion type="single" collapsible className="mt-4">
            {FREQUENT_QUESTIONS.map((item, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger className="text-left font-medium">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Have a question?
          </h2>
          <p className="mt-2 text-muted-foreground">
            Whether you need a specialized vehicle, long-term quote, or airport transfer details, send our team a message.
          </p>
          <div className="mt-6">
            <InquiryForm />
          </div>
        </div>
      </section>

      {/* 7. Bottom CTA */}
      <section className="container-page pb-14">
        <div className="flex flex-col items-start gap-4 rounded-lg bg-navy p-8 text-navy-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Ready to explore Sri Lanka?</h2>
            <p className="mt-1 opacity-90">
              Browse our diverse fleet and reserve your preferred vehicle in minutes.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/vehicles">Browse the fleet</Link>
          </Button>
        </div>
      </section>
    </>
  );
}

