import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ErrorState, LoadingState } from "@/components/site/common";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/blog/$slug")({
  head: () => ({ meta: [
    { title: "Travel guide — SwiftDrive Rentals" },
    { name: "description", content: "A SwiftDrive travel guide for driving in Sri Lanka." },
    { property: "og:title", content: "Travel guide — SwiftDrive Rentals" },
    { property: "og:description", content: "A SwiftDrive travel guide for driving in Sri Lanka." },
    { property: "og:type", content: "article" },
  ] }),
  component: Post,
});

function Post() {
  const { slug } = Route.useParams();
  const post = useQuery({
    queryKey: ["blog", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (post.isLoading) return <LoadingState />;
  if (post.error) return <div className="container-page py-10"><ErrorState message="This article couldn't be loaded." onRetry={() => post.refetch()} /></div>;
  const p = post.data;
  if (!p) return <div className="container-page py-16 text-center"><h1 className="text-2xl font-bold">Article not found</h1><Link to="/blog" className="mt-4 inline-block text-primary">All guides</Link></div>;
  return (
    <article className="container-page max-w-3xl py-10">
      <Link to="/blog" className="text-sm text-primary hover:underline">← All guides</Link>
      <h1 className="mt-4 text-3xl font-bold">{p.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{formatDate(p.published_at)}</p>
      {p.cover_url && <img src={p.cover_url} alt="" width={1200} height={700} className="mt-6 rounded-lg border" />}
      <div className="mt-6 space-y-4 text-[1.0625rem] leading-relaxed">
        {p.body.split(/\n\n+/).map((para, i) => <p key={i}>{para}</p>)}
      </div>
    </article>
  );
}
