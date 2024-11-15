"use client";

import { useState, createContext, useContext } from "react";
import { CopilotSidebar } from "@copilotkit/react-ui";
import { useCopilotReadable } from "@copilotkit/react-core";
import { marked } from "marked"; // Updated import for marked
import { saveAs } from 'file-saver'; // Library to save generated PDF
import { jsPDF } from "jspdf"; // Import jsPDF
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
  const [combinedData, setCombinedData] = useState<string>(""); // State to store combined data

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
      const arxivResults = data.results || [{ title: "Error", summary: "No results found." }];

      // Update both results and combinedData
      setResults((prevResults) => [...prevResults, ...arxivResults]);
      updateCombinedData(arxivResults, "arxiv"); // Append Arxiv results to combined data with specific formatting
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

      // Update both results and combinedData
      setResults((prevResults) => [...prevResults, ...ragResults]);
      updateCombinedData(ragResults, "rag"); // Append RAG results to combined data with specific formatting
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

      // Update both results and combinedData
      setResults((prevResults) => [...prevResults, ...webResults]);
      updateCombinedData(webResults, "web"); // Append Web search results to combined data with specific formatting
    } catch (error) {
      console.error("Error:", error);
      setResults((prevResults) => [...prevResults, { title: "Error", summary: "Something went wrong." }]);
    }
  };

  const updateCombinedData = (newResults, source) => {
    let combinedText = "";
  
    // Add a newline before the query using <br> tags
    combinedText += `<br><strong>Query:</strong> ${query}<br><br>`;
  
    // Format results based on their source
    newResults.forEach(result => {
      if (source === 'arxiv') {
        combinedText += `<strong>${result.title}</strong><br><strong>Summary:</strong> ${result.summary}<br><br>`;
        if (result.pdf_url) {
          combinedText += `<a href="${result.pdf_url}" style="color: blue;">[Download PDF]</a><br><br>`; // HTML link with line breaks
        }
      } else if (source === 'rag') {
        combinedText += `<strong>${result.title}</strong><br><br>${result.summary.replace(/\n/g, '<br>')}<br><br>`;
      } else if (source === 'web') {
        combinedText += `<strong>${result.title}</strong><br><br><strong>Response:</strong> ${result.summary.replace(/\n/g, '<br>')}<br><br>`;
        if (result.url) {
          combinedText += `<a href="${result.url}" style="color: blue;">[Read More]</a><br><br>`; // HTML link with line breaks
        }
      }
    });
  
    // Update combinedData with HTML content
    setCombinedData(prev => prev + combinedText);
  };
  

  // Convert the combinedData to Markdown format and render HTML
  const markdownContent = marked(combinedData);

  // Function to generate PDF from combinedData
  const generatePDF = () => {
    const doc = new jsPDF();

    // Set font and styles
    doc.setFont("helvetica", "normal");

    // Calculate page margins
    const margin = 10;
    const pageHeight = doc.internal.pageSize.height;
    let y = margin;

    // Wrap text to fit the page width and handle multi-page generation
    const lines = doc.splitTextToSize(combinedData, doc.internal.pageSize.width - margin * 2);
    let currentLine = 0;

    // Loop through the lines and add them to the PDF, creating new pages as needed
    while (currentLine < lines.length) {
      doc.text(lines.slice(currentLine, currentLine + 25), margin, y, {
        maxWidth: doc.internal.pageSize.width - margin * 2,
        lineHeightFactor: 1.5,
      });
      currentLine += 25;
      y += 10;

      // Check if we need to add a new page
      if (y >= pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    }

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
