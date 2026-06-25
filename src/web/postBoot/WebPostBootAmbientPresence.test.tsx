// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";
import { WebPostBootAmbientPresence } from "./WebPostBootAmbientPresence";
import { WebPostBootLoading } from "./WebPostBootLoading";
import { WebPostBootTransition } from "./WebPostBootTransition";

const noop = () => {};
const ambientSource = readFileSync(
  "src/web/postBoot/WebPostBootAmbientPresence.tsx",
  "utf8",
);

describe("WebPostBootAmbientPresence", () => {
  it("renders a decorative, inert blurred hologram identity layer", () => {
    const html = renderToStaticMarkup(<WebPostBootAmbientPresence />);
    expect(html).toContain('data-web-postboot-ambient-presence=""');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('src="/hologram.png"');
    expect(html).toContain("pointer-events-none");
  });

  it("is token-free and static (no skin tokens, boundary, or motion)", () => {
    // No skin-presence tokens / skin boundary / resolver coupling on the bridge.
    expect(ambientSource).not.toMatch(/--luca-skin|SkinBoundary|getLucaSkin/);
    // No motion introduced.
    expect(ambientSource).not.toMatch(/animate-|transition-|@keyframes|requestAnimationFrame/);
  });

  it("is rendered behind content on the loading bridge surface", () => {
    const html = renderToStaticMarkup(<WebPostBootLoading />);
    expect(html).toContain('data-web-postboot-ambient-presence=""');
    expect(html).toContain('src="/hologram.png"');
    // The existing sharp identity / orb language is preserved.
    expect(html).toContain("Preparing your LucaOS environment");
  });

  it("is rendered behind content on the resolved transition surface", () => {
    const html = renderToStaticMarkup(
      <WebPostBootTransition
        snapshot={{
          userState: "new_user",
          hasCompletedOnboarding: false,
          canEnterShell: false,
        }}
        onContinue={noop}
        onRestartOnboarding={noop}
      />,
    );
    expect(html).toContain('data-web-postboot-ambient-presence=""');
    expect(html).toContain('src="/hologram.png"');
    // The deliberate sharp face mark (/icon.png) is left intact alongside it.
    expect(html).toContain('src="/icon.png"');
  });
});
