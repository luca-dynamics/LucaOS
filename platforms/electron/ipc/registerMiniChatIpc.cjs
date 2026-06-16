/* eslint-disable @typescript-eslint/no-require-imports */
function registerMiniChatIpc({ ipcMain, getWidgetWindow, getChatWindow, getMainWindow, createMainWindow, logger = console }) {
    ipcMain.on('restore-main-window', () => {
        const widgetWindow = getWidgetWindow();
        const mainWindow = getMainWindow();

        if (widgetWindow) {
            widgetWindow.close();
        }
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        } else {
            createMainWindow();
        }
    });

    ipcMain.on('chat-widget-message', (event, data) => {
        logger.log('[IPC] Received chat-widget-message:', data.text);
        const mainWindow = getMainWindow();
        const chatWindow = getChatWindow();

        if (mainWindow) {
            logger.log('[IPC] Forwarding to main window');
            mainWindow.webContents.send('chat-widget-message', data);
        } else {
            logger.error('[IPC] Main window not available!');
            if (chatWindow) {
                chatWindow.webContents.send('chat-widget-reply',
                    'Error: Main window not available. Please open Luca first.');
            }
        }
    });

    ipcMain.on('reply-chat-widget', (event, reply) => {
        logger.log('[IPC] Sending reply to chat widget:', reply.substring(0, 50) + '...');
        const chatWindow = getChatWindow();
        if (chatWindow) {
            chatWindow.webContents.send('chat-widget-reply', reply);
        }
    });

    ipcMain.on('broadcast-stream-chunk', (event, data) => {
        const chatWindow = getChatWindow();
        if (chatWindow && !chatWindow.isDestroyed()) {
            chatWindow.webContents.send('chat-widget-stream-chunk', data);
        }
    });

    ipcMain.on('chat-widget-close', () => {
        logger.log('[IPC] Closing chat widget window');
        const chatWindow = getChatWindow();
        const widgetWindow = getWidgetWindow();
        if (chatWindow) {
            chatWindow.hide();
        }
        if (widgetWindow) {
            widgetWindow.hide();
        }
    });

    ipcMain.on('chat-widget-resize', (event, { height, resizable }) => {
        const chatWindow = getChatWindow();
        if (chatWindow) {
            const [currentW] = chatWindow.getSize();

            if (resizable) {
                chatWindow.setMinimumSize(300, 200);
                chatWindow.setMaximumSize(1000, 900);
            } else {
                chatWindow.setMinimumSize(300, height);
                chatWindow.setMaximumSize(1000, height);
            }

            chatWindow.setSize(currentW, height, true);

            if (typeof resizable === 'boolean') {
                chatWindow.setResizable(resizable);
            }
        }
    });
}

module.exports = { registerMiniChatIpc };
