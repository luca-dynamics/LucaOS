/* eslint-disable @typescript-eslint/no-require-imports */
const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

function registerChatHistoryIpc() {
  ipcMain.handle('scan-chat-history', async () => {
    const sources = [];
    const home = os.homedir();
    const downloadsDir = path.join(home, 'Downloads');

    // 1. Downloads Folder Exports (ChatGPT & Claude)
    const exportTargets = [
      { name: 'ChatGPT Export (conversations.json)', file: 'conversations.json', source: 'chatgpt' },
      { name: 'Claude Export (conversations.json)', file: 'claude_export.json', source: 'claude' },
      { name: 'ChatGPT Export (chatgpt_export.json)', file: 'chatgpt_export.json', source: 'chatgpt' },
    ];

    for (const target of exportTargets) {
      const fullPath = path.join(downloadsDir, target.file);
      try {
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (content && content.length < 30 * 1024 * 1024) {
            const payload = JSON.parse(content);
            sources.push({
              source: target.source,
              name: target.name,
              filePath: fullPath,
              payload,
            });
          }
        }
      } catch {
        // Skip unparseable files
      }
    }

    // 2. Claude Code Local Projects (`~/.claude/projects/`)
    const claudeProjectsDir = path.join(home, '.claude', 'projects');
    try {
      if (fs.existsSync(claudeProjectsDir)) {
        const projectFolders = fs.readdirSync(claudeProjectsDir);
        for (const folder of projectFolders.slice(0, 10)) {
          const folderPath = path.join(claudeProjectsDir, folder);
          if (fs.statSync(folderPath).isDirectory()) {
            const files = fs.readdirSync(folderPath).filter((f) => f.endsWith('.jsonl') || f.endsWith('.json'));
            const chats = [];
            for (const file of files.slice(0, 15)) {
              try {
                const text = fs.readFileSync(path.join(folderPath, file), 'utf-8');
                const lines = text.split('\n').filter(Boolean);
                const messages = lines.map((l) => {
                  try { return JSON.parse(l); } catch { return null; }
                }).filter(Boolean);
                if (messages.length > 0) {
                  chats.push({ name: `${folder} - ${file}`, messages });
                }
              } catch {
                // Ignore individual unparseable files
              }
            }
            if (chats.length > 0) {
              sources.push({
                source: 'claude',
                name: `Claude Code Project (${folder})`,
                filePath: folderPath,
                payload: { chats },
              });
            }
          }
        }
      }
    } catch {
      // Ignore missing claude projects folder
    }

    // 3. Cursor AI App Data (`%APPDATA%\Cursor\User\` or `~/Library/Application Support/Cursor/User/`)
    const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(home, 'Library', 'Application Support') : path.join(home, '.config'));
    const cursorDir = path.join(appData, 'Cursor', 'User');
    try {
      if (fs.existsSync(cursorDir)) {
        sources.push({
          source: 'cursor',
          name: 'Cursor AI User Data',
          filePath: cursorDir,
          status: 'detected',
        });
      }
    } catch {
      // Ignore
    }

    // 4. Ollama Directory (`~/.ollama`)
    const ollamaDir = path.join(home, '.ollama');
    try {
      if (fs.existsSync(ollamaDir)) {
        sources.push({
          source: 'ollama',
          name: 'Ollama Local Models Directory',
          filePath: ollamaDir,
          status: 'detected',
        });
      }
    } catch {
      // Ignore
    }

    return { sources };
  });
}

module.exports = { registerChatHistoryIpc };
