import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/common";
import { InquiryForm } from "@/components/site/InquiryForm";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [
    { title: "Contact SwiftDrive Rentals" },
    { name: "description", content: "Send a rental inquiry to the SwiftDrive team in Negombo." },
    { property: "og:title", content: "Contact SwiftDrive Rentals" },
    { property: "og:description", content: "Send a rental inquiry to the SwiftDrive team." },
  ] }),
  component: Contact,
});

function Contact() {
  return (
    <>
      <PageHeader title="Contact us" description="Questions about rates, long-term rentals or an existing booking? We'll reply by email." />
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-4 text-sm">
          <div><p className="font-semibold">Location</p><p className="text-muted-foreground">Negombo, Sri Lanka</p></div>
          <div><p className="font-semibold">Phone and email</p><p className="text-muted-foreground">To be added by the business.</p></div>
          <div><p className="font-semibold">Response</p><p className="text-muted-foreground">Signed-in customers can see replies under “My account”.</p></div>
        </div>
        <div className="rounded-lg border bg-card p-6"><InquiryForm /></div>
      </div>
    </>
  );
}
