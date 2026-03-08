# Shared in-memory state for Cortex
notion_tokens = {}
google_tokens = {}
rag = None
_current_rag_model = None
LIGHTRAG_AVAILABLE = False
rag_embedding_func = None
GOOGLE_API_KEY = None
MODEL_PATHS = {}
MODELS_BASE_DIR = None
RAG_BASE_DIR = None
MASTER_DB_PATH = None
