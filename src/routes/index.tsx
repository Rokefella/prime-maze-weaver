import { createFileRoute } from "@tanstack/react-router";
import { WeaverWorkspace } from "@/components/world/WeaverWorkspace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PRÆM Instrument Builder" },
      { name: "description", content: "Design Ulam-spiral maze levels with prime-cell fragments and export them as JSON." },
      { property: "og:title", content: "PRÆM Instrument Builder" },
      { property: "og:description", content: "Design Ulam-spiral maze levels with prime-cell fragments and export them as JSON." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return <WeaverWorkspace />;
}
