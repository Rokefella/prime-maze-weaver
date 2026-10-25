import { createFileRoute } from "@tanstack/react-router";
import { WeaverWorkspace } from "@/components/world/WeaverWorkspace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PRÆM Instrument Builder" },
      { name: "description", content: "Weave PRÆM mazes, villages and rooms, and design the open world's eras, areas, places and links." },
      { property: "og:title", content: "PRÆM Instrument Builder" },
      { property: "og:description", content: "Weave PRÆM mazes, villages and rooms, and design the open world's eras, areas, places and links." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return <WeaverWorkspace />;
}
