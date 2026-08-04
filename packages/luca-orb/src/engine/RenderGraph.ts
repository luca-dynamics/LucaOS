import { RenderPass, RenderContext } from "./RenderPass";

export class RenderGraph {
  private passes: RenderPass[] = [];

  public addPass(pass: RenderPass): void {
    this.passes.push(pass);
  }

  public getPass(id: string): RenderPass | undefined {
    return this.passes.find((p) => p.id === id);
  }

  public setPassEnabled(id: string, enabled: boolean): void {
    const pass = this.getPass(id);
    if (pass) pass.enabled = enabled;
  }

  public execute(ctx: RenderContext): void {
    for (const pass of this.passes) {
      if (pass.enabled) {
        pass.execute(ctx);
      }
    }
  }
}
