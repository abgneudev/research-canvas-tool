import os
from dotenv import load_dotenv
import logging
from openai import OpenAI
from pinecone import Pinecone  # Correct import for Pinecone v3.0+
from langchain_pinecone import Pinecone as PineconeVectorStore  # Correct import for LangChain Pinecone
from langchain_openai import OpenAIEmbeddings  # Updated import
from transformers import CLIPProcessor, CLIPModel
import torch

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Initialize Pinecone client using the new object-oriented approach (v3.0+)
api_key = os.getenv("PINECONE_API_KEY")
if not api_key:
    logging.error("PINECONE_API_KEY is not set in the environment variables.")
    raise ValueError("PINECONE_API_KEY is missing.")
else:
    logging.info("Pinecone API key loaded successfully.")

pc = Pinecone(api_key=api_key)
logging.info("Initialized Pinecone client.")

# Define index names
image_index_name = "md-images"
text_index_name = "md-text"

# Check if image index exists, if not, create it
if image_index_name not in pc.list_indexes().names():
    logging.info(f"Index '{image_index_name}' does not exist. Creating a new index...")
    pc.create_index(
        name=image_index_name,
        dimension=512,  # Dimension for image embeddings
        metric='cosine'
    )
    logging.info(f"Index '{image_index_name}' created successfully.")
else:
    logging.info(f"Index '{image_index_name}' already exists.")

# Connect to the existing Pinecone image index
image_index = pc.Index(image_index_name)
logging.info(f"Connected to Pinecone index: {image_index_name}")

# Check if text index exists, if not, create it
if text_index_name not in pc.list_indexes().names():
    logging.info(f"Index '{text_index_name}' does not exist. Creating a new index...")
    pc.create_index(
        name=text_index_name,
        dimension=1536,  # Dimension for text embeddings
        metric='cosine'
    )
    logging.info(f"Index '{text_index_name}' created successfully.")
else:
    logging.info(f"Index '{text_index_name}' already exists.")

# Connect to the existing Pinecone text index
text_index = pc.Index(text_index_name)
logging.info(f"Connected to Pinecone index: {text_index_name}")

# Initialize text embeddings using OpenAI's Ada model
text_embeddings = OpenAIEmbeddings(model="text-embedding-ada-002")

# Load CLIP model and processor directly for image embeddings
model_name = "openai/clip-vit-base-patch16"
processor = CLIPProcessor.from_pretrained(model_name)
clip_model = CLIPModel.from_pretrained(model_name)

# Function to generate image embeddings using CLIP model
def get_image_embedding(image):
    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        embedding = clip_model.get_image_features(**inputs)
    return embedding.cpu().numpy().flatten()  # Flatten to 512-dimension vector

logging.info("CLIP model and processor loaded for image embeddings.")

# Initialize LangChain's Pinecone vector store for text
text_vector_store = PineconeVectorStore(index=text_index, embedding=text_embeddings)
logging.info("Initialized LangChain's Pinecone vector store for text.")

# Initialize LangChain's Pinecone vector store for images
def image_embeddings(image):
    embedding = get_image_embedding(image)
    return embedding

logging.info("Initialized custom image embeddings function for images.")

# Create retrievers using the vector stores' as_retriever method
text_retriever = text_vector_store.as_retriever()
logging.info("Text retriever created from the text vector store.")

# NVIDIA API Key and Client Initialization
nvidia_api_key = os.getenv("NVIDIA_API_KEY")
if not nvidia_api_key:
    logging.error("NVIDIA_API_KEY is not set in the environment variables.")
    raise ValueError("NVIDIA_API_KEY is missing.")
else:
    logging.info("NVIDIA API key loaded successfully.")

nvidia_api_url = "https://integrate.api.nvidia.com/v1"
nvidia_model_name = "meta/llama3-8b-instruct"

# Initialize the NVIDIA client using OpenAI's interface
client = OpenAI(
    base_url=nvidia_api_url,
    api_key=nvidia_api_key
)

def call_nvidia_llama_api(prompt: str) -> dict:
    """
    Sends a prompt to the NVIDIA Llama3-8B-Instruct API and retrieves a response.

    Args:
        prompt (str): The input prompt for the Llama3-8B-Instruct model.

    Returns:
        dict: The generated response from Llama3-8B-Instruct.
    """
    logging.info(f"Calling NVIDIA Llama3 API with prompt: {prompt[:50]}...")

    try:
        completion = client.chat.completions.create(
            model=nvidia_model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=200
        )

        return completion

    except Exception as e:
        logging.error(f"Failed to call NVIDIA API: {str(e)}")
        return {"error": str(e)}

def rag_search(query: str) -> dict:
    """
    Retrieves relevant documents from Pinecone based on the query and generates a response using NVIDIA Llama3-8B-Instruct API.

    Args:
        query (str): The user's query.

    Returns:
        dict: The generated response from Llama3-8B-Instruct.
    """
    logging.info(f"Performing RAG search for query: {query}")

    # Retrieve relevant documents from Pinecone based on query
    relevant_text_docs = text_retriever.get_relevant_documents(query)
    
    if relevant_text_docs:
        logging.info(f"Retrieved {len(relevant_text_docs)} relevant text documents from Pinecone.")
    else:
        logging.warning("No relevant text documents found for the query.")

    # Prepare prompt by combining query and retrieved documents' content
    prompt = f"Query: {query}\nText Documents: {relevant_text_docs}"
    
    # Call NVIDIA Llama3-8B-Instruct API to generate a response based on the combined prompt
    llama_response = call_nvidia_llama_api(prompt)

    return llama_response

# Example usage:
# query = "What is the capital of France?"
# response = rag_search(query)
# print(response)
