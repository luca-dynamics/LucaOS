import test from "node:test";
import assert from "node:assert/strict";
import { ChannelSessionRouter } from "./channelSessionRouter.js";

test("ChannelSessionRouter registers and retrieves channel session mapping", () => {
  const router = new ChannelSessionRouter();

  const session = router.registerSession("telegram", "123456", "desktop-host-1", "mission-abc");
  assert.equal(session.channel, "telegram");
  assert.equal(session.chatId, "123456");
  assert.equal(session.desktopDeviceId, "desktop-host-1");

  const retrieved = router.getSession("telegram", "123456");
  assert.notEqual(retrieved, null);
  assert.equal(retrieved.desktopDeviceId, "desktop-host-1");
});

test("ChannelSessionRouter prunes inactive sessions based on TTL", () => {
  const router = new ChannelSessionRouter();

  router.registerSession("discord", "987654", "desktop-host-1");
  const key = router.makeKey("discord", "987654");
  const session = router.sessions.get(key);
  session.lastActive = Date.now() - 5000; // 5 seconds ago

  const pruned = router.pruneInactiveSessions(1000); // 1 sec TTL
  assert.equal(pruned, 1);
  assert.equal(router.getSession("discord", "987654"), null);
});

test("ChannelSessionRouter formats standardized channel payload", () => {
  const router = new ChannelSessionRouter();

  const payload = router.formatPayload("Hello from LucaOS", { caption: "Desktop View" });
  assert.equal(payload.text, "Hello from LucaOS");
  assert.equal(payload.caption, "Desktop View");
  assert.equal(typeof payload.timestamp, "number");
});
