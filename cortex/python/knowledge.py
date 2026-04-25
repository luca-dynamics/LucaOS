import os
import json
import sqlite3
import time
import asyncio
import numpy as np
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
import warnings
warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")
from google import genai

# Try to import LightRAG
try:
    from lightrag import LightRAG
    from lightrag.utils import EmbeddingFunc
    from lightrag.kg.shared_storage import initialize_pipeline_status
    LIGHTRAG_AVAILABLE = True
except ImportError:
    LIGHTRAG_AVAILABLE = False

try:
    from hdc_manager import HDCMemoryManager
    HDC_AVAILABLE = True
except ImportError:
    HDC_AVAILABLE = False

# Constants (should ideally be imported from a config or passed in)
MASTER_DB_PATH = os.path.join(os.path.expanduser("~"), ".luca", "data", "luca.db")
RAG_BASE_DIR = os.path.join(os.path.expanduser("~"), "Luca", "memory")

# Shared state placeholders (actual instances managed by cortex.py or a dedicated state manager)
_rag_instance = None
_current_rag_model = None

class SQLiteMemoryConnector:
    """Bridges Node.js SQLite memory to Python LightRAG."""
    def __init__(self, db_path=MASTER_DB_PATH):
        self.db_path = db_path
        self.hdc = HDCMemoryManager(db_path) if HDC_AVAILABLE else None

    async def add_memory_hdc(self, content: str):
        """Standard ingestion via REFRAG-inspired HDC."""
        if self.hdc:
            return await self.hdc.ingest_with_compression(content)
        return self.add_memory(content)

    def get_all_memories(self):
        try:
            if not os.path.exists(self.db_path):
                return []
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='memories'")
            if not cursor.fetchone():
                conn.close()
                return []
            cursor.execute("SELECT content FROM memories ORDER BY id ASC")
            rows = cursor.fetchall()
            conn.close()
            return [row[0] for row in rows]
        except Exception as e:
            print(f"[KNOWLEDGE] SQLite Read Error: {e}")
            return []

    def get_unindexed_memories(self, last_id: int):
        """Returns all memories with ID > last_id."""
        try:
            if not os.path.exists(self.db_path):
                return []
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT id, content, type, metadata_json, deep_summary FROM memories WHERE id > ? ORDER BY id ASC", (last_id,))
            rows = cursor.fetchall()
            conn.close()
            return [{"id": r[0], "content": r[1], "type": r[2], "metadata": json.loads(r[3]) if r[3] else {}, "deep_summary": r[4]} for r in rows]
        except Exception as e:
            print(f"[KNOWLEDGE] SQLite Read Error: {e}")
            return []

    def add_memory(self, content: str):
        """Save raw memory to master SQLite."""
        try:
            # Ensure table exists
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS memories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT,
                    type TEXT,
                    metadata_json TEXT,
                    deep_summary TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("INSERT INTO memories (content) VALUES (?)", (content,))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"[KNOWLEDGE] SQLite Write Error: {e}")
            return False

    def add_entity(self, name, entity_type="concept", description=""):
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            now = int(time.time() * 1000)
            cursor.execute("""
                INSERT INTO entities (name, type, description, last_updated)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(name) DO UPDATE SET
                    last_updated = excluded.last_updated,
                    description = COALESCE(excluded.description, entities.description)
            """, (name, entity_type, description, now))
            conn.commit()
            cursor.execute("SELECT id FROM entities WHERE name = ?", (name,))
            res = cursor.fetchone()
            entity_id = res[0] if res else None
            conn.close()
            return entity_id
        except Exception as e:
            print(f"[KNOWLEDGE] SQLite Entity Error: {e}")
            return None

    def add_relationship(self, source_name, relation, target_name):
        try:
            source_id = self.add_entity(source_name)
            target_id = self.add_entity(target_name)
            if not source_id or not target_id: return
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            now = int(time.time() * 1000)
            cursor.execute("""
                INSERT INTO relationships (source_id, target_id, relation, created_at, weight)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(source_id, target_id, relation) DO UPDATE SET
                    created_at = excluded.created_at
            """, (source_id, target_id, relation, now, 1.0))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[KNOWLEDGE] SQLite Relation Error: {e}")

async def distill_knowledge(raw_text, existing_context="", api_key=None):
    """Uses LLM to extract structured facts, entities, and relationships."""
    if not raw_text.strip():
        return {"facts": [], "entities": [], "relationships": []}
        
    if api_key:
        os.environ["GEMINI_API_KEY"] = api_key
        os.environ["LLM_BINDING_API_KEY"] = api_key

    prompt = f"""
    You are Luca's Knowledge Distiller. I will provide you with raw text/logs.
    Extract ONLY NEW or UPDATED information relative to the existing knowledge.
    
    EXISTING KNOWLEDGE:
    {existing_context}
    
    Output Format (JSON only):
    {{
      "facts": ["Fact 1"],
      "entities": [{{ "name": "Name", "type": "Type", "description": "Desc" }}],
      "relationships": [{{ "source": "S", "relation": "R", "target": "T" }}]
    }}
    
    TEXT:
    {raw_text[:15000]}
    """
    
    try:
        # Custom Gemini Complete Implementation to bypass missing library module
        genai_client = genai.Client(api_key=api_key)
        response = genai_client.models.generate_content(
            model="gemini-1.5-flash", 
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction="You are a knowledge extraction engine. Respond only with valid JSON."
            )
        )
        json_str = response.text.strip()
        if json_str.startswith("```json"):
            json_str = json_str[7:-3].strip()
        elif json_str.startswith("```"):
            json_str = json_str[3:-3].strip()
            
        return json.loads(json_str)
    except Exception as e:
        print(f"[KNOWLEDGE] Distillation Error: {e}")
        return {"facts": [], "entities": [], "relationships": []}

async def get_rag(embedding_func, api_key):
    """Retrieve or initialize LightRAG instance."""
    global _rag_instance, _current_rag_model
    
    if not LIGHTRAG_AVAILABLE:
        return None
        
    model_id = getattr(embedding_func, 'current_model', 'gemini')
    
    if _rag_instance is not None and _current_rag_model == model_id:
        return _rag_instance
        
    try:
        model_dir = os.path.join(RAG_BASE_DIR, model_id)
        if not os.path.exists(model_dir):
            os.makedirs(model_dir)
            
        # Define local bridge for LightRAG if module is missing
        async def gemini_complete_bridge(prompt, system_prompt=None, history_messages=[], **kwargs):
            client = genai.Client(api_key=api_key)
            contents = []
            for msg in history_messages:
                contents.append({"role": msg["role"], "parts": [{"text": msg["content"]}]})
            contents.append({"role": "user", "parts": [{"text": prompt}]})
            
            resp = client.models.generate_content(
                model="gemini-1.5-flash",
                contents=contents,
                config=genai.types.GenerateContentConfig(system_instruction=system_prompt)
            )
            return resp.text

        _rag_instance = LightRAG(
            working_dir=model_dir,
            llm_model_func=gemini_complete_bridge,
            llm_model_name="gemini-1.5-flash", 
            embedding_func=embedding_func,
            llm_model_max_async=2, 
            llm_model_kwargs={"api_key": api_key, "key": api_key} 
        )
        
        await _rag_instance.initialize_storages()
        await initialize_pipeline_status()
        
        _current_rag_model = model_id
        return _rag_instance
    except Exception as e:
        print(f"[KNOWLEDGE] LightRAG Init Failed: {e}")
        return None
