import os
import json
import sqlite3
from fastapi import APIRouter, HTTPException
from knowledge import SQLiteMemoryConnector, distill_knowledge, get_rag
import state

router = APIRouter(prefix="/knowledge/obsidian", tags=["obsidian"])

# Simple in-memory config for vault path
obsidian_config = {"vault_path": None}

@router.get("/status")
async def obsidian_status():
    """Check if Obsidian vault is configured."""
    return {
        "connected": obsidian_config["vault_path"] is not None,
        "vault_path": obsidian_config["vault_path"]
    }

@router.post("/configure")
async def obsidian_configure(vault_path: str):
    """Set the local Obsidian vault path."""
    if not os.path.exists(vault_path):
        raise HTTPException(status_code=400, detail="Vault path does not exist")
    
    # Basic check for an Obsidian vault (usually has a .obsidian folder)
    dot_obsidian = os.path.join(vault_path, ".obsidian")
    if not os.path.exists(dot_obsidian):
        # We'll allow it anyway as some vaults might not have it or it's just a folder of MDs
        print(f"[OBSIDIAN] WARN: No .obsidian folder found at {vault_path}")
    
    obsidian_config["vault_path"] = vault_path
    return {"status": "success", "vault_path": vault_path}

@router.get("/files")
async def obsidian_list_files():
    """List markdown files in the configured vault."""
    path = obsidian_config["vault_path"]
    if not path:
        raise HTTPException(status_code=400, detail="Obsidian vault not configured")
    
    files = []
    try:
        for root, _, filenames in os.walk(path):
            # Skip .obsidian folder and other hidden dirs
            if "/." in root or "\\." in root:
                continue
                
            for filename in filenames:
                if filename.endswith(".md"):
                    full_path = os.path.join(root, filename)
                    rel_path = os.path.relpath(full_path, path)
                    files.append({
                        "id": rel_path, # Use relative path as ID
                        "title": filename,
                        "path": rel_path
                    })
        return {"files": files[:100]} # Limit to first 100 for now
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync")
async def obsidian_sync_file(file_path: str):
    """Sync a specific MD file from the vault."""
    vault_base = obsidian_config["vault_path"]
    if not vault_base:
        raise HTTPException(status_code=400, detail="Vault not configured")
    
    full_path = os.path.join(vault_base, file_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        with open(full_path, "r", encoding="utf-8") as f:
            raw_text = f.read()
            
        if not raw_text.strip():
            return {"status": "success", "message": "File is empty"}
            
        connector = SQLiteMemoryConnector()
        existing_mems = connector.get_all_memories()
        existing_context = "\n".join(existing_mems[-50:])
        
        distilled = await distill_knowledge(raw_text, existing_context, api_key=state.GOOGLE_API_KEY)
        facts = distilled.get("facts", [])
        entities = distilled.get("entities", [])
        relationships = distilled.get("relationships", [])
        
        # Ingest into Master SQLite (Unified Sync Stream)
        # Background sync_loop in cortex.py now handles RAG indexing automatically
        
        conn = sqlite3.connect(connector.db_path)
        cursor = conn.cursor()
        for fact in facts:
            cursor.execute("INSERT INTO memories (content, type, metadata_json) VALUES (?, 'fact', ?)", 
                          (fact, json.dumps({"source": "obsidian", "file": file_path})))
        conn.commit()
        conn.close()
        
        for ent in entities:
            connector.add_entity(ent["name"], ent.get("type", "concept"), ent.get("description", ""))
        for rel in relationships:
            connector.add_relationship(rel["source"], rel["relation"], rel["target"])
            
        return {"status": "success", "message": f"Synced {len(facts)} facts.", "facts": facts[:5]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
