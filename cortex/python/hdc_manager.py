import os
import sqlite3
import asyncio
from typing import List, Dict, Any
try:
    from cortex.python.platform_utils import get_models_dir
except ImportError:
    from platform_utils import get_models_dir

class NeuralCompressor:
    """
    Implements a REFRAG-inspired 'Compress-Sense-Expand' layer for Luca OS.
    Couples broad context with low-latency decoding by using 'Deep Summaries'.
    """
    def __init__(self, model_id="model2vec-potion"):
        # We target a super-fast local encoder for the 'Compression' phase
        self.model_id = model_id
        self.encoder = None # Lazy loaded
        
    async def compress_chunk(self, text: str) -> str:
        """
        Generates a high-entropy neural summary of a text chunk.
        In research (REFRAG), this would be a projected embedding.
        In practice (Luca), we use a hyper-fast distilled summarizer.
        """
        # Placeholder for actual local model call
        # Logic: We use the most context-rich 10% of the text or a T5-mini summary
        try:
            # Simulated compression for now — will hook into cortex.py internal logic
            words = text.split()
            if len(words) < 50: return text
            
            # Extract key semantic anchors (simple heuristic for prototype)
            # In Phase 2, this will use the T5-distilled weights
            summary = " ".join(words[:20]) + " ... " + " ".join(words[-20:])
            return f"[NEURAL_CHUNK]: {summary}"
        except Exception:
            return text[:200]

class HDCMemoryManager:
    """Hybrid Dense Context manager for sovereign RAG."""
    def __init__(self, db_path):
        self.db_path = db_path
        self.compressor = NeuralCompressor()
        self._ensure_schema()

    def _ensure_schema(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        # Add deep_summary column if missing (The HDC Pillar)
        try:
            cursor.execute("ALTER TABLE memories ADD COLUMN deep_summary TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            cursor.execute("ALTER TABLE memories ADD COLUMN type TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            cursor.execute("ALTER TABLE memories ADD COLUMN metadata_json TEXT")
        except sqlite3.OperationalError:
            pass
        conn.commit()
        conn.close()

    async def ingest_with_compression(self, content: str):
        """Asynchronously ingests and compresses memory for high-speed retrieval."""
        summary = await self.compressor.compress_chunk(content)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO memories (content, deep_summary, type)
            VALUES (?, ?, ?)
        """, (content, summary, "hdc_chunk"))
        conn.commit()
        conn.close()
        return True

    def sense_and_expand(self, retrieved_results: List[Dict], query_similarity: float = 0.85) -> str:
        """
        The REFRAG Gate: Decides which chunks to expand to full tokens.
        Upgraded to be model-aware (checks for Moondream2/Qwen visibility).
        """
        # Check model availability for 'Deep Expansion'
        # We try to use the most powerful local vision-reasoner if available
        try:
             from vision_agent import ui_tars
             has_high_fidelity = ui_tars.is_downloaded("qwen2.5-vl-3b") or ui_tars.is_downloaded("moondream2")
        except Exception:
             has_high_fidelity = False

        context_blocks = []
        for result in retrieved_results:
            sim = result.get('similarity', 0)
            is_visual = "[VISUAL_SNAPSHOT" in result.get('content', '')
            
            if sim >= query_similarity:
                # FULL EXPANSION (High Fidelity)
                if is_visual and has_high_fidelity:
                     # Flag for the LLM that this is a neurally-rich visual anchor
                     context_blocks.append(f"SOURCE (VISUAL_DEEP_EXPANSION):\n{result['content']}\n[SYSTEM: Neural expansion available for this anchor.]")
                else:
                     context_blocks.append(f"SOURCE (FULL):\n{result['content']}")
            elif sim >= 0.6:
                # DEEP SUMMARY (Contextual Awareness)
                context_blocks.append(f"SOURCE (DENSE_SUMMARY):\n{result.get('deep_summary', result['content'][:100])}")
            
        return "\n\n---\n\n".join(context_blocks)
