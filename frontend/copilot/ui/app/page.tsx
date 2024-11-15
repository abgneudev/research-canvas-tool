"use client";

import { useState, createContext, useContext } from "react";
import { CopilotSidebar } from "@copilotkit/react-ui";
import { useCopilotReadable } from "@copilotkit/react-core";
import { marked } from "marked";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import "./styles.css";

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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [combinedData, setCombinedData] = useState<string>("");

  // Share `results` with CopilotKit using `useCopilotReadable`
  useCopilotReadable({
    description: "Search results from the user's query",
    value: results,
    id: "search-results",
  });

  // Helper function to strip HTML tags
  const stripHtmlTags = (html: string) => {
    return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
  };

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
      const arxivResults = data.results || [{ title: "Error", summary: "No results found." }];

      setResults((prevResults) => [...prevResults, ...arxivResults]);
      updateCombinedData(arxivResults, "arxiv");
    } catch (error) {
      console.error("Error:", error);
      setResults((prevResults) => [...prevResults, { title: "Error", summary: "Something went wrong." }]);
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
      const ragResults = content ? [{ title: "RAG Search Result", summary: content }] : [{ title: "Error", summary: "No results found." }];

      setResults((prevResults) => [...prevResults, ...ragResults]);
      updateCombinedData(ragResults, "rag");
    } catch (error) {
      console.error("Error:", error);
      setResults((prevResults) => [...prevResults, { title: "Error", summary: "Something went wrong." }]);
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
      const webResults = data.context ? [{ title: "Web Search Result", summary: data.context }] : [{ title: "Error", summary: "No results found." }];

      setResults((prevResults) => [...prevResults, ...webResults]);
      updateCombinedData(webResults, "web");
    } catch (error) {
      console.error("Error:", error);
      setResults((prevResults) => [...prevResults, { title: "Error", summary: "Something went wrong." }]);
    }
  };

  const updateCombinedData = (newResults, source) => {
    let combinedText = "";

    combinedText += `<br><strong>Query:</strong> ${query}<br><br>`;

    newResults.forEach((result) => {
      if (source === "arxiv") {
        combinedText += `<strong>${result.title}</strong><br><strong>Summary:</strong> ${result.summary}<br><br>`;
        if (result.pdf_url) {
          combinedText += `<a href="${result.pdf_url}" style="color: blue;">[Download PDF]</a><br><br>`;
        }
      } else if (source === "rag") {
        combinedText += `<strong>${result.title}</strong><br><br>${result.summary.replace(/\n/g, "<br>")}<br><br>`;
      } else if (source === "web") {
        combinedText += `<strong>${result.title}</strong><br><br><strong>Response:</strong> ${result.summary.replace(/\n/g, "<br>")}<br><br>`;
        if (result.url) {
          combinedText += `<a href="${result.url}" style="color: blue;">[Read More]</a><br><br>`;
        }
      }
    });

    setCombinedData((prev) => prev + combinedText);
  };

  const markdownContent = marked(combinedData);

  // Updated function to generate PDF from combinedData
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "normal");
  
    const margin = 10;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let y = margin;
  
    // Convert combinedData to plain text
    const plainText = stripHtmlTags(combinedData.replace(/<br>/g, "\n"));
  
    // Split text into lines with appropriate width
    const lines = doc.splitTextToSize(plainText, pageWidth - margin * 2);
  
    // Loop through lines and add them to the PDF
    lines.forEach((line) => {
      // Check if the current y-position exceeds the page height
      if (y + 10 >= pageHeight - margin) {
        doc.addPage();
        y = margin; // Reset y-position for new page
      }
      doc.text(line, margin, y);
      y += 10; // Increment y-position for next line
    });
  
    // Save the PDF
    doc.save("combined-data.pdf");
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
            <button onClick={generatePDF}>Generate PDF</button>
          </div>

          <div className="main-content">
            {Array.isArray(results) && results.length > 0 ? (
              <div className="results-container">
                {results.map((result, index) => (
                  <div key={index} className="card">
                    <h3>{result.title}</h3>
                    <p>{result.summary}</p>

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
              <p>No results found.</p>
            )}

            {combinedData.trim() ? (
              <div className="card combined-data-container">
                <h2>Combined Output (Markdown)</h2>
                <div
                  className="combined-results"
                  dangerouslySetInnerHTML={{ __html: markdownContent }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </CopilotSidebar>
    </SearchContext.Provider>
  );
}
