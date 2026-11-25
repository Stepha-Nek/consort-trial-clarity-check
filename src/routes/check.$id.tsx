import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Progress } from "@/components/consort/Progress";
import { Report } from "@/components/consort/Report";

export const Route = createFileRoute("/check/$id")({
  head: () => ({
    meta: [
      { title: "Your CONSORT report — CONSORT Check" },
      { name: "description", content: "Item-by-item CONSORT report for your trial manuscript." },
      { property: "og:title", content: "Your CONSORT report — CONSORT Check" },
      { property: "og:description", content: "See which CONSORT items passed, failed and why." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckPage,
});

function CheckPage() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["check", id],
    queryFn: () => api.getCheck(id),
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === "done" || s === "error" ? false : 1500;
    },
    retry: false,
  });

  if (q.isError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Report not available</h1>
        <p className="mt-3 text-muted-foreground">{q.error.message}</p>
        <Link to="/check" className="mt-8 inline-block rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground">Check a manuscript</Link>
      </div>
    );
  }
  const c = q.data;
  if (!c || c.status !== "done") return <Progress check={c} />;
  return <Report check={c} />;
}
