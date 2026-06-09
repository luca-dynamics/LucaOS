import React from "react";
import {
  getWebUnavailableMessage,
  WEB_UNAVAILABLE_TITLE,
} from "../../config/webUnavailable";
import { Icon } from "./Icon";

interface WebUnavailableStateProps {
  featureName: string;
  detail?: string;
  className?: string;
}

export const WebUnavailableState: React.FC<WebUnavailableStateProps> = ({
  featureName,
  detail,
  className = "",
}) => (
  <div
    className={`rounded-lg border border-white/10 bg-white/[0.03] p-3 ${className}`}
    role="status"
  >
    <div className="flex items-start gap-2.5">
      <Icon
        name="Monitor"
        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-text-muted)]"
      />
      <div className="space-y-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--app-text-main)]">
          {WEB_UNAVAILABLE_TITLE}
        </div>
        <p className="text-[11px] leading-relaxed text-[var(--app-text-muted)]">
          {detail ?? getWebUnavailableMessage(featureName)}
        </p>
      </div>
    </div>
  </div>
);
