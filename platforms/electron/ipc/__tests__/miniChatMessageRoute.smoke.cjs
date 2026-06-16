/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('assert');
const {
    normalizeMiniChatMessagePayload
} = require('../routes/miniChatMessageRoute.cjs');

assert.deepStrictEqual(normalizeMiniChatMessagePayload('hello'), { text: 'hello' });

const objectPayload = { text: 'hello', requestId: 'req-1', nested: { keep: true } };
const normalizedObject = normalizeMiniChatMessagePayload(objectPayload);
assert.deepStrictEqual(normalizedObject, objectPayload);
assert.notStrictEqual(normalizedObject, objectPayload);
assert.strictEqual(normalizedObject.nested, objectPayload.nested);

assert.deepStrictEqual(normalizeMiniChatMessagePayload(['hello']), {});
assert.deepStrictEqual(normalizeMiniChatMessagePayload(null), {});
assert.deepStrictEqual(normalizeMiniChatMessagePayload(undefined), {});
