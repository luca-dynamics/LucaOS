import React, { useState } from "react";
import { lucaMaterialPopoverStyle } from "../../styles/lucaMaterialSystem";

export interface UiNode {
  text: string;
  resourceId: string;
  class: string;
  bounds: string; // Format: "[x1,y1][x2,y2]"
  children?: UiNode[];
  clickable?: boolean;
}

interface UiTreeOverlayProps {
  tree: UiNode | null;
  onElementClick?: (node: UiNode) => void;
}

const UiTreeOverlay: React.FC<UiTreeOverlayProps> = ({
  tree,
  onElementClick,
}) => {
  const [hoveredNode, setHoveredNode] = useState<UiNode | null>(null);

  if (!tree) return null;

  // Helper to parse Android bounds string "[0,0][1080,2340]"
  const parseBounds = (boundsStr: string) => {
    const match = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!match) return null;
    return {
      x1: parseInt(match[1]),
      y1: parseInt(match[2]),
      x2: parseInt(match[3]),
      y2: parseInt(match[4]),
    };
  };

  const renderNodes = (node: UiNode, depth = 0): React.ReactNode[] => {
    const bounds = parseBounds(node.bounds);
    const elements: React.ReactNode[] = [];

    if (bounds) {
      // Scale coordinates to container size
      // Default Android Ref: 1080x2340 (common modern vertical aspect)
      const REF_WIDTH = 1080;
      const REF_HEIGHT = 2340;

      const left = (bounds.x1 / REF_WIDTH) * 100;
      const top = (bounds.y1 / REF_HEIGHT) * 100;
      const nodeWidth = ((bounds.x2 - bounds.x1) / REF_WIDTH) * 100;
      const nodeHeight = ((bounds.y2 - bounds.y1) / REF_HEIGHT) * 100;

      // Only show boxes for interactive elements or text to reduce noise
      const isInteractive =
        node.clickable === true ||
        node.text.length > 0 ||
        node.resourceId.length > 0;

      if (isInteractive && nodeWidth > 0 && nodeHeight > 0) {
        elements.push(
          <div
            key={`${node.resourceId}-${node.bounds}-${depth}`}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: `${top}%`,
              width: `${nodeWidth}%`,
              height: `${nodeHeight}%`,
              border:
                hoveredNode === node
                  ? "1px solid rgba(6, 182, 212, 0.8)"
                  : "1px solid rgba(6, 182, 212, 0.2)",
              backgroundColor:
                hoveredNode === node ? "rgba(6, 182, 212, 0.1)" : "transparent",
              boxShadow:
                hoveredNode === node
                  ? "0 0 10px rgba(6, 182, 212, 0.3), inset 0 0 5px rgba(6, 182, 212, 0.2)"
                  : "none",
              borderRadius: "2px",
              cursor: node.clickable ? "pointer" : "default",
              zIndex: 100 + depth,
              transition: "all 0.2s ease-in-out",
            }}
            onMouseEnter={(e) => {
              e.stopPropagation();
              setHoveredNode(node);
            }}
            onMouseLeave={() => setHoveredNode(null)}
            onClick={(e) => {
              if (node.clickable) {
                e.stopPropagation();
                onElementClick?.(node);
              }
            }}
          >
            {hoveredNode === node && (
              <div className="absolute top-0 left-full ml-2 z-[200] pointer-events-none">
                <div
                  className="min-w-[200px] rounded-xl border p-2"
                  style={lucaMaterialPopoverStyle}
                >
                  <div className="text-[10px] font-mono text-rq-blue border-b border-rq-blue/20 pb-1 mb-1 font-bold uppercase tracking-wider">
                    Element Inspector
                  </div>
                  {node.resourceId && (
                    <div className="mb-1">
                      <div className="font-mono text-[8px] text-[var(--luca-text-tertiary)]">
                        ID
                      </div>
                      <div className="text-[10px] text-[var(--luca-info,#4f8cff)] font-mono break-all">
                        {node.resourceId.split("/").pop()}
                      </div>
                    </div>
                  )}
                  {node.text && (
                    <div className="mb-1">
                      <div className="font-mono text-[8px] text-[var(--luca-text-tertiary)]">
                        TEXT
                      </div>
                      <div className="text-[10px] font-medium italic text-[var(--luca-text-primary)]">
                        &quot;{node.text}&quot;
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <span className="text-[8px] px-1 bg-rq-blue/20 text-rq-blue rounded border border-rq-blue/30 uppercase">
                      {node.class.split(".").pop()}
                    </span>
                    {node.clickable && (
                      <span className="text-[8px] px-1 bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] text-[var(--luca-success,#4fbf7a)] rounded border border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)] uppercase">
                        Clickable
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }
    }

    if (node.children) {
      node.children.forEach((child) => {
        elements.push(...renderNodes(child, depth + 1));
      });
    }

    return elements;
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-auto"
      style={{ width: "100%", height: "100%" }}
    >
      {renderNodes(tree)}
    </div>
  );
};

export default UiTreeOverlay;
