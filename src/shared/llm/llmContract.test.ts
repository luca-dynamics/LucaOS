/**
 * Tests for the image half of the shared LLM contract.
 *
 * `resolveImagePayload` exists because all three wire modules used to hardcode
 * `image/jpeg`, and vision sends PNG — so a screenshot routed through any of
 * them was labelled as a JPEG it wasn't. The helper takes the media type from
 * the image itself instead, and the reason it takes the *bare* base64 case to
 * jpeg rather than something stricter is compatibility: every caller before
 * RFC-0006 Stage 2 Change 3 passed bare base64 and meant jpeg, so those requests
 * have to stay byte-identical. That is the first test below, and it is the one
 * that would catch a "cleaner" default silently changing what existing callers
 * send.
 */

import { describe, expect, it } from "vitest";

import {
  DEFAULT_IMAGE_MIME_TYPE,
  resolveImagePayload,
} from "./llmContract.js";

describe("resolveImagePayload", () => {
  it("keeps bare base64 on jpeg, so every pre-existing caller is unchanged", () => {
    expect(resolveImagePayload("BASE64")).toEqual({
      data: "BASE64",
      mimeType: "image/jpeg",
    });
    expect(DEFAULT_IMAGE_MIME_TYPE).toBe("image/jpeg");
  });

  it.each([
    ["image/png", "data:image/png;base64,AAAB", "AAAB"],
    ["image/webp", "data:image/webp;base64,AAAB", "AAAB"],
    ["image/jpeg", "data:image/jpeg;base64,AAAB", "AAAB"],
    ["image/svg+xml", "data:image/svg+xml;base64,AAAB", "AAAB"],
  ])("reads %s off a data URL and strips the prefix", (mimeType, url, data) => {
    expect(resolveImagePayload(url)).toEqual({ data, mimeType });
  });

  it("lowercases the media type, so a vendor never sees IMAGE/PNG", () => {
    expect(resolveImagePayload("data:IMAGE/PNG;base64,AAAB")).toEqual({
      data: "AAAB",
      mimeType: "image/png",
    });
  });

  it("leaves base64 padding alone", () => {
    // A greedy prefix strip is the obvious way to get this wrong: '=' padding
    // is part of the payload, and losing it corrupts the image.
    const padded = "iVBORw0KGgoAAAANSUhEUg==";

    expect(resolveImagePayload(`data:image/png;base64,${padded}`).data).toBe(
      padded,
    );
    expect(resolveImagePayload(padded).data).toBe(padded);
  });

  it("does not mistake a plain-text data URL for a base64 one", () => {
    // No `;base64,` marker, so there is no prefix to strip and nothing to
    // re-label. Passing it through whole lets the vendor reject it, which beats
    // handing over a payload we have quietly mangled.
    const svg = "data:image/svg+xml,<svg/>";

    expect(resolveImagePayload(svg)).toEqual({
      data: svg,
      mimeType: "image/jpeg",
    });
  });

  it("passes a non-string through instead of dropping it", () => {
    // The typed contract is string-only; this branch is for the core's JS
    // callers, hence the cast. An empty image sent as though it were fine is
    // worse than a vendor error naming the real problem.
    const notAnImage = { buffer: true } as unknown as string;

    expect(resolveImagePayload(notAnImage)).toEqual({
      data: notAnImage,
      mimeType: "image/jpeg",
    });
  });
});
