/* eslint-disable @typescript-eslint/no-require-imports */
const { createMiniChatWindow } = require('./createMiniChatWindow.cjs');
const { createHologramWindow } = require('./createHologramWindow.cjs');
const { createWidgetWindow } = require('./createWidgetWindow.cjs');
const { createVisualCoreWindow } = require('./createVisualCoreWindow.cjs');

module.exports = {
    createMiniChatWindow,
    createHologramWindow,
    createWidgetWindow,
    createVisualCoreWindow
};
