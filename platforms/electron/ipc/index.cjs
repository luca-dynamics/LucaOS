/* eslint-disable @typescript-eslint/no-require-imports */
const { registerPresenceIpc } = require('./registerPresenceIpc.cjs');
const { registerWidgetIpc } = require('./registerWidgetIpc.cjs');
const { registerHologramIpc } = require('./registerHologramIpc.cjs');
const { registerMiniChatIpc } = require('./registerMiniChatIpc.cjs');
const { registerVisualCoreIpc } = require('./registerVisualCoreIpc.cjs');

module.exports = {
    registerPresenceIpc,
    registerWidgetIpc,
    registerHologramIpc,
    registerMiniChatIpc,
    registerVisualCoreIpc
};
