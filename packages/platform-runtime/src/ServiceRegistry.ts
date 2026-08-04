export class ServiceRegistry {
  private services: Map<string, unknown> = new Map();

  public register<T>(key: string, service: T): void {
    this.services.set(key, service);
  }

  public resolve<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service '${key}' not registered in ServiceRegistry.`);
    }
    return service as T;
  }

  public has(key: string): boolean {
    return this.services.has(key);
  }
}
