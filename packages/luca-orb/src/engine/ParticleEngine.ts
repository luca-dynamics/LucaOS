export interface SparkleParticle {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
  alpha: number;
}

export class ParticleEngine {
  public static generateParticles(count: number): SparkleParticle[] {
    const particles: SparkleParticle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      particles.push({
        id: i,
        x: Math.cos(angle) * 0.45,
        y: Math.sin(angle) * 0.45,
        radius: 1.2 + (i % 3) * 0.5,
        speed: 0.5 + (i % 4) * 0.25,
        alpha: 0.3 + (i % 5) * 0.12,
      });
    }
    return particles;
  }
}
