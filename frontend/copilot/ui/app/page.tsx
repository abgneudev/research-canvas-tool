"use client";

import { useState, createContext, useContext, useEffect } from "react";
import { CopilotSidebar } from "@copilotkit/react-ui";
import { useCopilotReadable } from "@copilotkit/react-core";
import "./styles.css"; // Import the CSS file

// Create context for sharing search results
const SearchContext = createContext<any>(null);

export function useSearchContext() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearchContext must be used within a SearchProvider");
  }
  return context;
}

export default function Home() {
  const [query, setQuery] = useState(""); // State for capturing query input
  const [results, setResults] = useState<any[]>([]); // Initialize results as an empty array

  // Share `results` with CopilotKit using `useCopilotReadable`
  useCopilotReadable({
    description: "Search results from the user's query",
    value: results,
    id: "search-results", // Unique identifier for the shared state
  });

  // Function to handle Arxiv search
  const searchArxiv = async () => {
    const maxResults = 5;
    const requestData = { query, max_results: maxResults };

    try {
      const response = await fetch("http://localhost:8000/copilotkit_remote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setResults(data.results || [{ title: "Error", summary: "No results found." }]);
    } catch (error) {
      console.error("Error:", error);
      setResults([{ title: "Error", summary: "Something went wrong." }]);
    }
  };

  // Function to handle RAG search
  const searchRag = async () => {
    const maxResults = 5;
    const requestData = { query, max_results: maxResults };

    try {
      const response = await fetch("http://localhost:8000/rag-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      setResults(content ? [{ title: "RAG Search Result", summary: content }] : [{ title: "Error", summary: "No results found." }]);
    } catch (error) {
      console.error("Error:", error);
      setResults([{ title: "Error", summary: "Something went wrong." }]);
    }
  };

  // Function to handle Web Search using Tavily
  const searchWeb = async () => {
    const requestData = { query };

    try {
      const response = await fetch("http://localhost:8000/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setResults(data.context ? [{ title: "Web Search Result", summary: data.context }] : [{ title: "Error", summary: "No results found." }]);
    } catch (error) {
      console.error("Error:", error);
      setResults([{ title: "Error", summary: "Something went wrong." }]);
    }
  };

  return (
    <SearchContext.Provider value={{ results }}>
      <CopilotSidebar
        defaultOpen={true}
        instructions="You are assisting the user as best as you can. Answer in the best way possible given the data you have."
        labels={{
          title: "Sidebar Assistant",
          initial: "How can I help you today?",
        }}
      >
        <div className="container">
          {/* Sidebar content for search remains unchanged */}
          <div className="sidebar">
            <h1>Search</h1>
            <input
              type="text"
              id="searchInput"
              placeholder="Enter search query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button onClick={searchArxiv}>Search Arxiv</button>
            <button onClick={searchRag}>Search RAG</button>
            <button onClick={searchWeb}>Search Web</button>
          </div>

          {/* Main content area for displaying results */}
          <div className="main-content">
            {Array.isArray(results) && results.length > 0 ? (
              <div className="results-container">
                {results.map((result: any, index: number) => (
                  <div key={index} className="card">
                    <h3>{result.title}</h3>
                    <p>{result.summary}</p>

                    {/* Display the PDF link for Arxiv results */}
                    {result.pdf_url && (
                      <div>
                        <a
                          href={result.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pdf-link"
                        >
                          Download PDF
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p>No results to display.</p>
            )}
          </div>
        </div>
      </CopilotSidebar>
    </SearchContext.Provider>
  );
}
