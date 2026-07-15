import React from "react";
import { Icon } from "./ui/Icon";
import {
  lucaMaterialControlActiveStyle,
  lucaMaterialControlStyle,
} from "../styles/lucaMaterialSystem";

interface WidgetControlsProps {
  isHovered: boolean;
  onExpand: () => void;
  onToggleHUD: () => void;
  isHUDActive: boolean;
}

const WidgetControls: React.FC<WidgetControlsProps> = ({
  isHovered,
  onExpand,
  onToggleHUD,
  isHUDActive,
}) => {
  if (!isHovered) return null;

  return (
    <div className="absolute top-0 right-0 p-2 flex flex-col gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleHUD();
        }}
        data-luca-material-role={isHUDActive ? "control-active" : "control"}
        className="luca-shell-control p-2 rounded-full border"
        style={isHUDActive ? lucaMaterialControlActiveStyle : lucaMaterialControlStyle}
        title={isHUDActive ? "Stop seeing screen" : "See screen"}
      >
        <Icon name="Monitor" size={14} />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onExpand();
        }}
        data-luca-material-role="control"
        className="luca-shell-control p-2 rounded-full border"
        style={lucaMaterialControlStyle}
        title="Open LucaOS"
      >
        <Icon name="Maximize2" size={14} />
      </button>
    </div>
  );
};

export default WidgetControls;
