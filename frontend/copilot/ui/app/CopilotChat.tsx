import { useEffect } from "react";
import { useSearchContext } from "./SearchContext";
import { CopilotSidebar } from "@copilotkit/react-ui";
import { useCopilotReadable } from "@copilotkit/react-core";

export default function CopilotSidebarComponent() {
  const { results } = useSearchContext();

  // Define readable state for CopilotKit
  useCopilotReadable({
    description: "The current search results from the user's query",
    value: results,
    id: "search-results", // Provide a unique identifier
  });

  // Log results for debugging
  useEffect(() => {
    if (Array.isArray(results) && results.length > 0) {
      console.log("Shared Results:", results);
    } else {
      console.log("No results to share.");
    }
  }, [results]);

  return (
    <CopilotSidebar
      defaultOpen={true}
      instructions="You can view the search results and assist based on the shared data."
      labels={{
        title: "Sidebar Assistant",
        initial: "How can I help you today?",
      }}
    />
  );
}
