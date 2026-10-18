import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/site/common";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/blog/")({
  head: () => ({ meta: [
    { title: "Travel guides and driving tips — SwiftDrive Rentals" },
    { name: "description", content: "Road-trip guides, driving tips and destinations around Sri Lanka." },
    { property: "og:title", content: "Travel guides — SwiftDrive Rentals" },
    { property: "og:description", content: "Road-trip guides, driving tips and destinations around Sri Lanka." },
  ] }),
  component: Blog,
});

function Blog() {
  const posts = useQuery({
    queryKey: ["blog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("blog_posts").select("slug, title, excerpt, cover_url, topic, published_at").eq("is_published", true).order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <>
      <PageHeader title="Travel guides" description="Road trips, driving tips and places to visit — written for SwiftDrive customers." />
      <div className="container-page py-10">
        {posts.isLoading ? <LoadingState /> : posts.error ? <ErrorState message="Articles couldn't be loaded." onRetry={() => posts.refetch()} /> :
          posts.data!.length === 0 ? <EmptyState title="No articles yet" /> : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.data!.map((p) => (
                <Link key={p.slug} to="/blog/$slug" params={{ slug: p.slug }} className="group overflow-hidden rounded-lg border bg-card">
                  {p.cover_url && <img src={p.cover_url} alt="" loading="lazy" width={600} height={350} className="aspect-[12/7] w-full object-cover" />}
                  <div className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">{p.topic.replace("-", " ")}</p>
                    <h2 className="mt-1 text-lg font-semibold group-hover:text-primary">{p.title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{p.excerpt}</p>
                    <p className="mt-3 text-xs text-muted-foreground">{formatDate(p.published_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
      </div>
    </>
  );
}
