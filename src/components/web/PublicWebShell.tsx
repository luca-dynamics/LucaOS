import React from "react";
import type { WebAccessPolicy } from "../../config/webAccessPolicy";
import "./PublicWebShell.css";

interface PublicWebShellProps {
  policy: WebAccessPolicy;
}

const featureCards = [
  {
    title: "Browser preview",
    status: "Available",
    tone: "available",
    description:
      "A safe public shell for the upcoming LucaOS browser control surface.",
  },
  {
    title: "Desktop control",
    status: "Desktop required",
    tone: "locked",
    description:
      "Native window, filesystem, shell, and device operations stay in the LucaOS desktop app.",
  },
  {
    title: "Local models / Ollama",
    status: "Desktop required",
    tone: "locked",
    description:
      "Local model installation, startup, deletion, and routing are not exposed to anonymous web visitors.",
  },
  {
    title: "Device linking",
    status: "Secure pairing coming",
    tone: "soon",
    description:
      "Browser-to-device control will require an explicit authenticated pairing boundary.",
  },
  {
    title: "Memory / account data",
    status: "Future API required",
    tone: "soon",
    description:
      "Personal memory, account state, and history require api.lucaos.space plus auth/session controls.",
  },
  {
    title: "Provider / model routing",
    status: "Future API required",
    tone: "soon",
    description:
      "Managed provider calls must remain behind a server-side API boundary, never in this public shell.",
  },
] as const;

const PublicWebShell: React.FC<PublicWebShellProps> = ({ policy }) => {
  return (
    <main className="public-web-shell" aria-labelledby="public-web-shell-title">
      <section
        className="public-web-shell__hero"
        aria-describedby="public-web-shell-summary"
      >
        <div className="public-web-shell__brand" aria-label="LucaOS">
          <span className="public-web-shell__mark">L</span>
          <span>LucaOS</span>
        </div>

        <div className="public-web-shell__eyebrow">Public web preview</div>
        <h1 id="public-web-shell-title">LucaOS Web Preview</h1>
        <p id="public-web-shell-summary" className="public-web-shell__summary">
          The browser control surface is being prepared. Desktop and
          local-runtime capabilities require the LucaOS desktop app or a future
          authenticated device/API connection.
        </p>

        <div className="public-web-shell__actions" aria-label="Preview actions">
          <a
            className="public-web-shell__button public-web-shell__button--primary"
            href="https://lucaos.space"
          >
            Back to LucaOS
          </a>
          <a
            className="public-web-shell__button public-web-shell__button--secondary"
            href="/download/mac.html"
          >
            Download Preview
          </a>
          <button
            className="public-web-shell__button public-web-shell__button--disabled"
            type="button"
            disabled
          >
            Sign in coming soon
          </button>
        </div>

        <div className="public-web-shell__notice" role="status">
          <span className="public-web-shell__pulse" aria-hidden="true" />
          <span>{policy.reason}</span>
        </div>
      </section>

      <section
        className="public-web-shell__cards"
        aria-label="Feature availability"
      >
        {featureCards.map((feature) => (
          <article className="public-web-shell__card" key={feature.title}>
            <div className="public-web-shell__card-header">
              <h2>{feature.title}</h2>
              <span
                className={`public-web-shell__status public-web-shell__status--${feature.tone}`}
              >
                {feature.status}
              </span>
            </div>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
};

export default PublicWebShell;
