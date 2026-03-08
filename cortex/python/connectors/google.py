import os
import json
import sqlite3
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from knowledge import SQLiteMemoryConnector, distill_knowledge, get_rag
import state

google_router = APIRouter(prefix="/knowledge/google", tags=["google"])
google_oauth_router = APIRouter(prefix="/oauth/google", tags=["google-oauth"])

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = "http://localhost:8000/oauth/google/callback"
GOOGLE_SCOPES = "https://www.googleapis.com/auth/drive.readonly"

@google_oauth_router.get("/start")
async def google_oauth_start():
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID not configured")
    
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope={GOOGLE_SCOPES}"
        f"&access_type=offline"
        f"&prompt=consent"
    )
    return {"auth_url": auth_url}

@google_oauth_router.get("/callback")
async def google_oauth_callback(code: str = None, error: str = None):
    if error:
        return {"status": "error", "message": error}
    if not code:
        return {"status": "error", "message": "No code received"}
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": GOOGLE_REDIRECT_URI
                }
            )
            data = resp.json()
        
        if "access_token" in data:
            state.google_tokens["default"] = data["access_token"]
            return HTMLResponse("""
            <html><body style="background:#111;color:#0f0;font-family:monospace;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
            <div style="text-align:center;"><h1>✅ Google Drive Connected!</h1><p>You can close this window and return to Luca.</p></div>
            </body></html>
            """)
        else:
            return {"status": "error", "message": data.get("error_description", "Token exchange failed")}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@google_oauth_router.get("/status")
async def google_oauth_status():
    return {"connected": "default" in state.google_tokens}

@google_router.get("/files")
async def google_list_files():
    if "default" not in state.google_tokens:
        raise HTTPException(status_code=401, detail="Google Drive not connected")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/drive/v3/files",
                headers={"Authorization": f"Bearer {state.google_tokens['default']}"},
                params={
                    "q": "mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.spreadsheet' or mimeType='text/plain'",
                    "fields": "files(id,name,mimeType,modifiedTime)",
                    "pageSize": 50
                }
            )
            data = resp.json()
        
        return {"files": [{
            "id": f.get("id"),
            "title": f.get("name", "Untitled"),
            "type": f.get("mimeType", "").split(".")[-1],
            "modified": f.get("modifiedTime")
        } for f in data.get("files", [])]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@google_router.post("/sync")
async def google_sync_file(file_id: str):
    if "default" not in state.google_tokens:
        raise HTTPException(status_code=401, detail="Google Drive not connected")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://www.googleapis.com/drive/v3/files/{file_id}/export",
                headers={"Authorization": f"Bearer {state.google_tokens['default']}"},
                params={"mimeType": "text/plain"}
            )
            if resp.status_code != 200:
                resp = await client.get(
                    f"https://www.googleapis.com/drive/v3/files/{file_id}",
                    headers={"Authorization": f"Bearer {state.google_tokens['default']}"},
                    params={"alt": "media"}
                )
            raw_text = resp.text
        
        if not raw_text.strip():
            return {"status": "success", "message": "File is empty", "facts": []}
        
        connector = SQLiteMemoryConnector()
        existing_mems = connector.get_all_memories()
        existing_context = "\n".join(existing_mems[-50:])
        
        distilled = await distill_knowledge(raw_text, existing_context, api_key=state.GOOGLE_API_KEY)
        facts = distilled.get("facts", [])
        entities = distilled.get("entities", [])
        relationships = distilled.get("relationships", [])
        
        active_rag = await get_rag(state.rag_embedding_func, state.GOOGLE_API_KEY)
        if active_rag:
            for fact in facts:
                await active_rag.ainsert(fact)
        
        conn = sqlite3.connect(connector.db_path)
        cursor = conn.cursor()
        for fact in facts:
            cursor.execute("INSERT INTO memories (content, type, metadata_json) VALUES (?, 'fact', ?)", 
                          (fact, json.dumps({"source": "google_drive", "file_id": file_id})))
        conn.commit()
        conn.close()
        
        for ent in entities:
            connector.add_entity(ent["name"], ent.get("type", "concept"), ent.get("description", ""))
        for rel in relationships:
            connector.add_relationship(rel["source"], rel["relation"], rel["target"])
            
        return {"status": "success", "message": f"Synced {len(facts)} facts.", "facts": facts[:5]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
