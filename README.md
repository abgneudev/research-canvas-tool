# Assignment 4: End-to-end research canvas tool

## Project Overview

This repository focuses on building an end-to-end research tool utilizing an Airflow pipeline to process documents, store vectors for fast similarity searches, and create a multi-agent research interface. The project involves parsing documents using Docling, storing vectors in Pinecone, and employing Langraph for a multi-agent system. Additionally, a user interaction interface, developed using Copilot coagent, will allow users to conduct research and save findings, culminating in a professional PDF report and structured Codelabs for clarity and future use.


## Data Flow and Architecture
Below is an overview of the data flow and ETL architecture used in the project:

![Airflow ETL and Data Flow Architecture](./images/airflow_etl_and_data_flow_architecture.png)

## Live Application Links
- **Deployed Application**: [Streamlit App Link]
- **Google Codelabs**: [[code labs](https://codelabs-preview.appspot.com/?file_id=11XVdlzZ8DJotFKU9-hZb4OrUASjitlK7xsWqiVxxNzg#0)]
- **GitHub Repository**: [[GitHub Repo Link](https://github.com/BigData-saturdayT2/pdf-intelligence)]

## Problem Statement
Researching, extracting insights, and managing document data can be a cumbersome and time-consuming task, especially when dealing with a large volume of content. The current challenge is to build an end-to-end tool that streamlines this process—starting from document acquisition to processing, vector storage, and intelligent querying—all while providing an interactive user interface. This assignment aims to solve these issues by automating document parsing, embedding generation, and enabling an efficient research experience using multiple agents for enhanced information retrieval.

## Project Goals
- **Technological Constraints**: Use Docling for document parsing, OpenAI embeddings for generating document vectors, store vectors in Pinecone for fast similarity searches, implement the multi-agent system with Langraph and build the research interface with Coagents
- **Pipeline Requirements**: Automate the document processing pipeline using Airflow and include data acquisition, preprocessing, embedding generation, and vector storage.
- **User Interaction Requirements**: Provide an interactive user interface for document selection, questions, and contextual answers and use Copilot or a similar frontend for user interaction.
- **System Integration Requirements**: Integrate the Airflow pipeline with Amazon S3 for document storage and integrate Pinecone, Langraph, and FastAPI for vector storage, research, and backend support.
- **Research Agent Requirements**: Include the following agents for research: Arxiv Agent: Find relevant research papers, Web Search Agent: Gather broader contextual information and a RAG Agent: Provide context-rich answers using Pinecone vectors.
- **Output Requirements**: Export results in Codelabs format and a templated PDF for professional reporting.

## Technologies Used
- **Apache Airflow**: Orchestrates the ETL pipeline for PDF processing.
- **IBM Watson Discovery**: Extracts structured data from PDFs.
- **AWS S3 & RDS**: Stores both raw and processed data.
- **FastAPI**: Manages user authentication and backend logic.
- **Streamlit**: Provides the frontend interface for data querying and interaction.
- **Docker**: Containerizes and deploys the system.
- **PyPDF2**: Performs open-source PDF text extraction.

## Repository Structure
```
├── frontend/                          # Streamlit application for frontend UI
├── backend/                            # FastAPI backend for user management and API services
├── images/                             # Project images and architecture diagrams
├── pipelines/                          # Airflow pipelines for PDF processing (PyPDF2 & IBM Watson)
├── .gitignore                          # Git ignore file
├── LICENSE                             # License information
├── README.md                           # Project documentation file
├── airflow_etl.ipynb                   # Jupyter notebook for ETL pipeline walkthrough
├── requirements.txt                    # Dependencies required for the project
└── s3_hf_gaia_data.py                  # Script for handling S3 data transfers
```

## Instructions for Running Locally
1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-repo-name.git
   cd your-repo-name
   ```
2. **Create a virtual environment**:
   ```bash
   python -m venv myenv
   source myenv/bin/activate
   ```
3. **Install the backend requirements**:
   ```bash
   cd backend 
   poetry install
   ```
4. **Install the frontend requiremnts**:
   ```bash
   cd frontend/copilot/ui 
   npm install
   ``` 
5. **Run the backend application**:
   ```bash
   uvicorn apis.main:app --host 0.0.0.0 --port 8000 --reload
   ```
6. **Run the frontend application**:
   ```bash
   npm run dev
   ```

## Deployment
The application is containerized using Docker Compose. Run the following command to deploy:
```bash
docker-compose up
```

## Documentation
- **Codelabs**: [[Codelabs](https://codelabs-preview.appspot.com/?file_id=11XVdlzZ8DJotFKU9-hZb4OrUASjitlK7xsWqiVxxNzg#0)]
- **Video Walkthrough**: [Video Link]

## Contribution
All team members contributed to this project. We attest that no external work was used.

| Name     | Work Done                                                                                           |
|----------|-----------------------------------------------------------------------------------------------------|
| Abhinav (36%) | Worked on Web Search Agent, Arxiv agent, Copilot UI, FastAPI integration, Chatbot integration, SmartQuery, Docker |
| Dheer (32%)    | Worked on RAG agent, NVIDIA model integration, research notes, md conversion, text to pdf extraction, documentation                 |
| Nishita (32%)  | Worked on architecture diagram creation, Airflow pipeline, S3, Pinecone database, md to codelabs, documentation  |
