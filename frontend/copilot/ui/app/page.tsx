"use client";

import { useState } from "react";
import './styles.css'; // Import the CSS file

export default function Home() {
  const [query, setQuery] = useState(""); // State for capturing query input
  const [results, setResults] = useState<any>(null); // State for storing results

  // Function to handle Arxiv search
  const searchArxiv = async () => {
    const maxResults = 5;

    const requestData = {
      query: query,
      max_results: maxResults,
    };

    try {
      const response = await fetch("http://localhost:8000/copilotkit_remote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      if (data.results) {
        setResults(data.results);
      } else {
        setResults([{ title: "Error", summary: "No results found." }]);
      }
    } catch (error) {
      console.error("Error:", error);
      setResults([{ title: "Error", summary: "Something went wrong." }]);
    }
  };

  // Function to handle RAG search
  const searchRag = async () => {
    const maxResults = 5;

    const requestData = {
      query: query,
      max_results: maxResults,
    };

    try {
      const response = await fetch("http://localhost:8000/rag-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        setResults([{ title: "RAG Search Result", summary: content }]);
      } else {
        setResults([{ title: "Error", summary: "No results found." }]);
      }
    } catch (error) {
      console.error("Error:", error);
      setResults([{ title: "Error", summary: "Something went wrong." }]);
    }
  };

  // Function to handle Web Search using Tavily
  const searchWeb = async () => {
    const requestData = {
      query: query,
    };

    try {
      const response = await fetch("http://localhost:8000/web-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      if (data.context) {
        setResults([{ title: "Web Search Result", summary: data.context }]);
      } else {
        setResults([{ title: "Error", summary: "No results found." }]);
      }
    } catch (error) {
      console.error("Error:", error);
      setResults([{ title: "Error", summary: "Something went wrong." }]);
    }
  };

  return (
    <div className="container">
      {/* Sidebar */}
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
        <button onClick={searchWeb}>Search Web</button> {/* New Web Search Button */}
      </div>

      {/* Main content area for displaying results */}
      <div className="main-content">
        {results && (
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
        )}
      </div>
    </div>
  );
}
