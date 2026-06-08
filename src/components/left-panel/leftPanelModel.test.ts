import { describe, expect, it } from "vitest";
import {
  DEVICE_COLLAPSE_THRESHOLD,
  LEFT_PANEL_TOOLS,
  LEFT_PANEL_TOOL_GROUPS,
  buildToolLauncherGroups,
  getDefaultExpandedGroups,
  getPreviewTools,
  shouldCollapseDevicesByDefault,
  type ToolGroupId,
} from "./leftPanelModel";

describe("leftPanelModel", () => {
  it("exposes the expected, stable tool group labels in order", () => {
    expect(LEFT_PANEL_TOOL_GROUPS.map((g) => g.id)).toEqual([
      "core",
      "vision",
      "finance",
      "visual",
      "installed",
    ]);
    expect(LEFT_PANEL_TOOL_GROUPS.map((g) => g.label)).toEqual([
      "Core",
      "Intelligence",
      "Finance",
      "Visual Modules",
      "Installed Modules",
    ]);
  });

  it("does not duplicate tool ids or action keys", () => {
    const ids = LEFT_PANEL_TOOLS.map((t) => t.id);
    const actionKeys = LEFT_PANEL_TOOLS.map((t) => t.actionKey);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(actionKeys).size).toBe(actionKeys.length);
  });

  it("assigns every tool to a known group", () => {
    const groupIds = new Set<ToolGroupId>(LEFT_PANEL_TOOL_GROUPS.map((g) => g.id));
    for (const tool of LEFT_PANEL_TOOLS) {
      expect(groupIds.has(tool.group)).toBe(true);
    }
  });

  it("includes expected categories of launchers", () => {
    const byGroup = (group: ToolGroupId) =>
      LEFT_PANEL_TOOLS.filter((t) => t.group === group).map((t) => t.label);

    expect(byGroup("core")).toEqual(
      expect.arrayContaining(["Skills", "Apps", "Screen", "Import", "IDE"]),
    );
    expect(byGroup("vision")).toEqual(
      expect.arrayContaining(["Reports", "OSINT", "Dark Web", "Train"]),
    );
    expect(byGroup("finance")).toEqual(
      expect.arrayContaining(["DeFi", "FX", "Stock Feed", "AI Trading", "Prediction"]),
    );
  });

  it("classifies preview/visual modules separately from real launchers", () => {
    const previews = getPreviewTools();
    expect(previews.map((t) => t.label).sort()).toEqual(["Security", "Sovereignty"]);
    for (const tool of previews) {
      expect(tool.group).toBe("visual");
      expect(tool.preview).toBe(true);
    }
    // Real launchers must never be flagged as preview.
    const realTools = LEFT_PANEL_TOOLS.filter((t) => t.group !== "visual");
    expect(realTools.every((t) => !t.preview)).toBe(true);
  });

  it("uses sane default expand state (only Core open)", () => {
    const expanded = getDefaultExpandedGroups();
    expect(expanded.core).toBe(true);
    expect(expanded.vision).toBe(false);
    expect(expanded.finance).toBe(false);
    expect(expanded.visual).toBe(false);
    expect(expanded.installed).toBe(false);
  });

  it("omits empty groups and appends installed modules safely", () => {
    const withoutModules = buildToolLauncherGroups([]);
    expect(withoutModules.find((g) => g.id === "installed")).toBeUndefined();

    const withModules = buildToolLauncherGroups([
      "Custom Module",
      "  ",
      "Another Module",
    ]);
    const installed = withModules.find((g) => g.id === "installed");
    expect(installed).toBeDefined();
    // Blank entries are dropped.
    expect(installed?.modules.map((m) => m.label)).toEqual([
      "Custom Module",
      "Another Module",
    ]);
    // Installed modules carry no launcher tools.
    expect(installed?.tools.length).toBe(0);
  });

  it("builds groups that contain only their own tools", () => {
    const groups = buildToolLauncherGroups([]);
    for (const group of groups) {
      expect(group.tools.every((t) => t.group === group.id)).toBe(true);
    }
  });

  it("only collapses the devices section once the list is long", () => {
    expect(shouldCollapseDevicesByDefault(0)).toBe(false);
    expect(shouldCollapseDevicesByDefault(DEVICE_COLLAPSE_THRESHOLD)).toBe(false);
    expect(shouldCollapseDevicesByDefault(DEVICE_COLLAPSE_THRESHOLD + 1)).toBe(true);
  });
});
