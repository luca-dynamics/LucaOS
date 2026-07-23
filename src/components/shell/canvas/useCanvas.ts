import { useEffect, useState } from "react";
import { canvasService, type CanvasItem } from "../../../services/canvas/canvasService";

/**
 * useCanvas — subscribe a component to canvasService.
 *
 * useSyncExternalStore would be the textbook choice, but the service predates
 * React and this mirrors the codebase's existing subscribe() hooks
 * (intentRoutingModeService et al.), so it stays consistent with how the rest
 * of the shell reads live services.
 */
export interface CanvasView {
  items: CanvasItem[];
  active: CanvasItem | null;
  editingScope: string | null;
}

export function useCanvas(): CanvasView {
  const [view, setView] = useState<CanvasView>(() => ({
    items: canvasService.getItems(),
    active: canvasService.getActiveItem(),
    editingScope: canvasService.getEditingScope(),
  }));

  useEffect(() => {
    const sync = () =>
      setView({
        items: canvasService.getItems(),
        active: canvasService.getActiveItem(),
        editingScope: canvasService.getEditingScope(),
      });
    sync();
    return canvasService.subscribe(sync);
  }, []);

  return view;
}
