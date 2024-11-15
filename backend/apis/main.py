from fastapi import FastAPI, HTTPException
from copilotkit import CopilotKitSDK, LangGraphAgent
from langgraph.graph import StateGraph, START, END, MessagesState
from apis.rag import rag_search
from apis.arxiv import search_arxiv
from apis.web import search_web
from apis.router import tool_node  # Updated router with both Arxiv and RAG tools
import logging
from fastapi.middleware.cors import CORSMiddleware
import markdown
import pdfkit
from io import BytesIO

# Initialize FastAPI app
app = FastAPI()

# Enable CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins, or specify specific ones
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods or specify methods like ['GET', 'POST']
    allow_headers=["*"],  # Allow all headers
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define state graph using MessagesState
state_graph = StateGraph(MessagesState)

def selector(state: MessagesState) -> str:
    """
    Selector function to determine which tool to use based on the last message.
    """
    last_message = state["messages"][-1].content.lower()
    
    if "arxiv" in last_message:
        return "fetch_arxiv"
    
    if "rag" in last_message:
        return "rag_search"
    
    if "web" in last_message:
        return "web_search"
    
    return "finalAnswer"


# Add nodes and edges to state graph based on architecture
state_graph.add_node("selector", selector)
state_graph.add_node("fetch_arxiv", tool_node)  # Run Arxiv search if selected by selector
state_graph.add_node("rag_search", tool_node)  # Run RAG search if selected by selector
state_graph.add_node("finalAnswer", lambda state: {"messages": state["messages"]})

state_graph.add_edge(START, "selector")
state_graph.add_edge("selector", "fetch_arxiv")
state_graph.add_edge("selector", "rag_search")
state_graph.add_edge("selector", "finalAnswer")
state_graph.add_edge("fetch_arxiv", "finalAnswer")
state_graph.add_edge("rag_search", "finalAnswer")

state_graph.add_node("web_search", tool_node)  # Run Web Search if selected by selector
state_graph.add_edge("selector", "web_search")
state_graph.add_edge("web_search", "finalAnswer")


# Compile workflow into runnable graph
workflow = state_graph.compile()

# Initialize CopilotKit SDK with LangGraphAgent
sdk = CopilotKitSDK(
    agents=[LangGraphAgent(
        name="combined_agent",
        description="An agent that searches for research papers using Arxiv, retrieves documents using RAG, or performs a web search using Tavily.",
        graph=workflow,
    )]
)

@app.post("/web-search")
async def web_search_endpoint(payload: dict):
    """
    Endpoint to handle web search queries using Tavily.
    
    Args:
        payload (dict): A dictionary containing the user's query.
    
    Returns:
        dict: The response from the web search process.
    """
    logger.info(f"Received payload: {payload}")
    
    query = payload.get("query", "")
    
    if not query:
        return {"error": "No query provided"}
    
    try:
        # Perform web search
        response = search_web.invoke(query)
        
        logger.info(f"Web search response: {response}")
        
        return response
    
    except Exception as e:
        logger.error(f"Error invoking Web Search tool: {str(e)}")
        return {"error": str(e)}

@app.post("/rag-search")
async def rag_search_endpoint(payload: dict):
    """
    Endpoint to handle RAG search queries.
    
    Args:
        payload (dict): A dictionary containing the user's query.
    
    Returns:
        dict: The response from the RAG search process.
    """
    logger.info(f"Received payload: {payload}")  # Log the incoming payload
    
    query = payload.get("query", "")
    
    if not query:
        return {"error": "No query provided"}
    
    try:
        # Perform RAG search
        response = rag_search(query)
        
        # Log the response from the rag_search function
        logger.info(f"RAG search response: {response}")
        
        return response
    
    except Exception as e:
        logger.error(f"Error invoking RAG search: {str(e)}")
        return {"error": str(e)}

@app.post("/copilotkit_remote")
async def handle_copilotkit_remote(payload: dict):
    """
    Endpoint to handle CopilotKit remote query processing.
    
    Args:
        payload (dict): A dictionary containing the user's query.
    
    Returns:
        dict: The search results from the Arxiv tool or an error message.
    """
    try:
        logger.info(f"Received payload: {payload}")
        
        # Extract query from the payload directly
        user_query = payload.get('query', '')
        logger.info(f"Running agent with payload: {user_query}")
        
        # Check if query is provided
        if user_query:
            logger.info(f"Searching for papers related to: {user_query}")
            
            # Use the invoke method to get the search results
            search_results = search_arxiv.invoke(user_query)
            
            logger.info(f"Search results returned: {search_results}")
            return search_results  # Return the search results
        else:
            logger.error("No query provided in the payload.")
            return {"error": "No query provided"}
    
    except Exception as e:
        logger.error(f"Error invoking Arxiv tool: {str(e)}")
        return {"error": str(e)}

@app.get("/")
def read_root():
    """
    Basic health check route.
    """
    return {"message": "Hello from Combined Agent!"}

@app.post("/convert-text-to-pdf")
async def convert_text_to_pdf(payload: dict):
    """
    Endpoint to convert raw text to markdown and then convert markdown to PDF.
    
    Args:
        payload (dict): A dictionary containing the raw text.
    
    Returns:
        PDF file as a byte stream.
    """
    logger.info(f"Received payload for text-to-pdf conversion: {payload}")
    
    raw_text = payload.get("text", "")
    
    if not raw_text:
        raise HTTPException(status_code=400, detail="No text provided")
    
    try:
        # Convert raw text to markdown
        markdown_content = markdown.markdown(raw_text)
        
        # Convert markdown to PDF using pdfkit
        pdf_output = pdfkit.from_string(markdown_content, False)
        
        # Return PDF as a byte stream in response
        return {"filename": "output.pdf", "pdf": pdf_output}
    
    except Exception as e:
        logger.error(f"Error converting text to PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error converting text to PDF: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
