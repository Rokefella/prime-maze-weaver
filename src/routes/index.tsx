import { createFileRoute } from "@tanstack/react-router";
import { PraemBuilder } from "@/components/maze/PraemBuilder";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PRÆM Instrument Builder" },
      { name: "description", content: "Design Ulam-spiral maze levels with prime-cell fragments and export them as JSON." },
      { property: "og:title", content: "PRÆM Instrument Builder" },
      { property: "og:description", content: "Design Ulam-spiral maze levels with prime-cell fragments and export them as JSON." },
    ],
  }),
  component: Index,
});

function Index() {
  return <PraemBuilder />;
}
