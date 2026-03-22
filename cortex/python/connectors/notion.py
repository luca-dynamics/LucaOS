import os
import json
import sqlite3
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from knowledge import SQLiteMemoryConnector, distill_knowledge, get_rag
import state

notion_router = APIRouter(prefix="/knowledge/notion", tags=["notion"])
notion_oauth_router = APIRouter(prefix="/oauth/notion", tags=["notion-oauth"])

# Notion OAuth Configuration
NOTION_CLIENT_ID = "616ac7eb-0797-4008-8e81-b0e685f40019"
NOTION_CLIENT_SECRET = os.environ.get("NOTION_CLIENT_SECRET", "")
NOTION_REDIRECT_URI = "http://localhost:8000/oauth/notion/callback"

@notion_oauth_router.get("/start")
async def notion_oauth_start():
    """Returns the Notion OAuth URL."""
    auth_url = (
        f"https://api.notion.com/v1/oauth/authorize"
        f"?owner=user"
        f"&client_id={NOTION_CLIENT_ID}"
        f"&redirect_uri={NOTION_REDIRECT_URI}"
        f"&response_type=code"
    )
    return {"auth_url": auth_url}

@notion_oauth_router.get("/callback")
async def notion_oauth_callback(code: str = None, error: str = None):
    """Handles Notion OAuth callback."""
    if error:
        return {"status": "error", "message": error}
    if not code:
        return {"status": "error", "message": "No code received"}
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.notion.com/v1/oauth/token",
                auth=(NOTION_CLIENT_ID, NOTION_CLIENT_SECRET),
                json={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": NOTION_REDIRECT_URI
                }
            )
            data = resp.json()
        
        if "access_token" in data:
            state.notion_tokens["default"] = data["access_token"]
            return HTMLResponse("""
            <html><body style="background:#111;color:#0f0;font-family:monospace;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
            <div style="text-align:center;"><h1>✅ Notion Connected!</h1><p>You can close this window and return to Luca.</p></div>
            </body></html>
            """)
        else:
            return {"status": "error", "message": data.get("error_description", "Exchange failed")}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@notion_oauth_router.get("/status")
async def notion_oauth_status():
    return {"connected": "default" in state.notion_tokens}

@notion_router.get("/pages")
async def notion_list_pages():
    if "default" not in state.notion_tokens:
        raise HTTPException(status_code=401, detail="Notion not connected")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.notion.com/v1/search",
                headers={
                    "Authorization": f"Bearer {state.notion_tokens['default']}",
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json"
                },
                json={"filter": {"property": "object", "value": "page"}}
            )
            data = resp.json()
                
        pages = []
        for result in data.get("results", []):
            title = "Untitled"
            if "properties" in result:
                for prop in result["properties"].values():
                    if prop.get("type") == "title" and prop.get("title"):
                        title = "".join([t.get("plain_text", "") for t in prop["title"]])
                        break
            pages.append({
                "id": result["id"],
                "title": title,
                "url": result.get("url", ""),
                "last_edited": result.get("last_edited_time", "")
            })
        return {"pages": pages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@notion_router.post("/sync")
async def notion_sync_page(page_id: str):
    if "default" not in state.notion_tokens:
        raise HTTPException(status_code=401, detail="Notion not connected")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://api.notion.com/v1/blocks/{page_id}/children",
                headers={
                    "Authorization": f"Bearer {state.notion_tokens['default']}",
                    "Notion-Version": "2022-06-28"
                }
            )
            data = resp.json()
        
        text_parts = []
        for block in data.get("results", []):
            block_type = block.get("type", "")
            if block_type in ["paragraph", "heading_1", "heading_2", "heading_3", "bulleted_list_item", "numbered_list_item"]:
                rich_text = block.get(block_type, {}).get("rich_text", [])
                text = "".join([rt.get("plain_text", "") for rt in rich_text])
                if text: text_parts.append(text)
        
        raw_text = "\n".join(text_parts)
        if not raw_text.strip():
            return {"status": "success", "message": "Empty page", "facts": []}
        
        connector = SQLiteMemoryConnector()
        existing_mems = connector.get_all_memories()
        existing_context = "\n".join(existing_mems[-50:])
        
        distilled = await distill_knowledge(raw_text, existing_context, api_key=state.GOOGLE_API_KEY)
        facts = distilled.get("facts", [])
        entities = distilled.get("entities", [])
        relationships = distilled.get("relationships", [])
        
        # We no longer call ainsert() here. 
        # The background sync_loop in cortex.py picks up all 'fact' entries automatically.
        
        conn = sqlite3.connect(connector.db_path)
        cursor = conn.cursor()
        for fact in facts:
            cursor.execute("INSERT INTO memories (content, type, metadata_json) VALUES (?, 'fact', ?)", 
                          (fact, json.dumps({"source": "notion", "page_id": page_id})))
        conn.commit()
        conn.close()
        
        for ent in entities:
            connector.add_entity(ent["name"], ent.get("type", "concept"), ent.get("description", ""))
        for rel in relationships:
            connector.add_relationship(rel["source"], rel["relation"], rel["target"])
            
        return {
            "status": "success",
            "message": f"Synced {len(facts)} facts.",
            "facts": facts[:5]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@notion_router.post("/sync-all")
async def notion_sync_all():
    if "default" not in state.notion_tokens:
        raise HTTPException(status_code=401, detail="Notion not connected")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.notion.com/v1/search",
                headers={
                    "Authorization": f"Bearer {state.notion_tokens['default']}",
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json"
                },
                json={"filter": {"property": "object", "value": "page"}}
            )
            data = resp.json()
        
        pages = data.get("results", [])
        count = 0
        for page in pages[:20]:
            try:
                res = await notion_sync_page(page["id"])
                if res["status"] == "success": count += 1
            except: pass
            
        return {"status": "success", "synced": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
