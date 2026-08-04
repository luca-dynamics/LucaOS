import { RenderContext } from "./RenderPass";

export interface SceneNode {
  id: string;
  visible: boolean;
  render(ctx: RenderContext): void;
}

export class SceneGraph {
  private nodes: SceneNode[] = [];

  public addNode(node: SceneNode): void {
    this.nodes.push(node);
  }

  public render(ctx: RenderContext): void {
    for (const node of this.nodes) {
      if (node.visible) {
        node.render(ctx);
      }
    }
  }
}
