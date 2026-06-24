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
# Model metadata / runtime handles shared with routers/models.py
PLATFORM_INFO = {}
is_model_supported = None  # callable(model_id, config) -> bool; set by cortex.py
embedding_logic = None     # HybridEmbeddingLogic instance; set by cortex.py
# Shared with routers/remote_access.py
LOCAL_IP = "127.0.0.1"
REMOTE_ACCESS_ENABLED = False
# RAG / embedding handles shared with routers/embeddings.py (set by cortex.py)
get_rag = None                 # async callable(mind_type=, model_id=) -> rag
get_rag_embedding_func = None  # callable() -> current rag_embedding_func (live)
normalize_local_model_id = None
is_local_model_request = None
