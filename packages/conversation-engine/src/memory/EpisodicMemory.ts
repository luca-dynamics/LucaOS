export interface MemoryEpisode {
  id: string;
  summary: string;
  timestamp: number;
  tags: string[];
}

export class EpisodicMemory {
  private episodes: MemoryEpisode[] = [];

  public recordEpisode(summary: string, tags: string[] = []): MemoryEpisode {
    const episode: MemoryEpisode = {
      id: `ep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      summary,
      timestamp: Date.now(),
      tags,
    };
    this.episodes.push(episode);
    return episode;
  }

  public query(tagFilter?: string): readonly MemoryEpisode[] {
    if (!tagFilter) return this.episodes;
    return this.episodes.filter((e) => e.tags.includes(tagFilter));
  }
}
