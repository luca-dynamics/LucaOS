#!/usr/bin/env python3
import sys
import json
import sqlite3
import os

# --- LUCA MCP BRIDGE ---
# This script allows external apps (like Claude Desktop) to query Luca's memory.
# It uses the Model Context Protocol (MCP) over standard I/O.

DB_PATH = os.path.expanduser("~/.luca/data/luca.db")

def get_db():
    return sqlite3.connect(DB_PATH)

def recall_luca(query=""):
    """Searches both entities and raw memories."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 1. Search Entities
        cursor.execute("SELECT name, type, description FROM entities WHERE name LIKE ? OR description LIKE ? LIMIT 5", (f"%{query}%", f"%{query}%"))
        entities = [{"name": r[0], "type": r[1], "description": r[2]} for r in cursor.fetchall()]
        
        # 2. Search Raw Memories
        cursor.execute("SELECT content FROM memories WHERE content LIKE ? ORDER BY id DESC LIMIT 5", (f"%{query}%",))
        memories = [r[0] for r in cursor.fetchall()]
        
        conn.close()
        
        result = []
        if entities:
            result.append("### Entities Found:")
            for e in entities:
                result.append(f"- {e['name']} ({e['type']}): {e['description']}")
        
        if memories:
            result.append("\n### Related Memories:")
            for m in memories:
                result.append(f"- {m}")
                
        if not result:
            return f"No specific matches found for '{query}' in Luca's memory."
            
        return "\n".join(result)
    except Exception as e:
        return f"Memory Search Failed: {str(e)}"

def memorize_luca(fact=""):
    """Stores a new fact directly into Luca's master memories table."""
    if not fact.strip():
        return "Fact cannot be empty."
        
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Insert as 'semantic' type memory
        cursor.execute("INSERT INTO memories (content, type) VALUES (?, 'semantic')", (fact,))
        conn.commit()
        conn.close()
        
        return f"Successfully stored in Luca's memory: '{fact}'"
    except Exception as e:
        return f"Failed to store memory: {str(e)}"

def handle_request(request):
    """Simple MCP JSON-RPC Handler."""
    msg_id = request.get("id")
    method = request.get("method")
    params = request.get("params", {})

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "luca-mcp",
                    "version": "1.0.0"
                }
            }
        }

    if method == "notifications/initialized":
        return None # No response needed

    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {
                "tools": [
                    {
                        "name": "recall_memory",
                        "description": "Query Luca's internal memory for user facts, project history, and preferences.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "query": {
                                    "type": "string",
                                    "description": "Topic or keyword to recall (e.g., 'React projects' or 'User career')."
                                }
                            }
                        }
                    },
                    {
                        "name": "memorize_fact",
                        "description": "Store a new personal fact, project update, or preference into Luca's long-term memory.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "fact": {
                                    "type": "string",
                                    "description": "The fact to be remembered (e.g., 'User started using Tailwind CSS' or 'User lives in London')."
                                }
                            },
                            "required": ["fact"]
                        }
                    }
                ]
            }
        }

    if method == "tools/call":
        name = params.get("name")
        arguments = params.get("arguments", {})
        
        if name == "recall_memory":
            query = arguments.get("query", "")
            content = recall_luca(query)
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "content": [{"type": "text", "text": content}]
                }
            }
            
        if name == "memorize_fact":
            fact = arguments.get("fact", "")
            content = memorize_luca(fact)
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "content": [{"type": "text", "text": content}]
                }
            }

    return {
        "jsonrpc": "2.0",
        "id": msg_id,
        "error": {"code": -32601, "message": "Method not found"}
    }

def main():
    """Main loop for stdio transport."""
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            
            request = json.loads(line)
            response = handle_request(request)
            
            if response:
                sys.stdout.write(json.dumps(response) + "\n")
                sys.stdout.flush()
        except EOFError:
            break
        except Exception:
            # Silently ignore parse errors to keep protocol alive
            continue

if __name__ == "__main__":
    main()
