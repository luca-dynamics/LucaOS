/**
 * SkillIngestion Service
 * Automates the discovery, extraction, and registration of new skills from URLs.
 * Inspired by Accomplish - seamless capability expansion.
 */

import { apiUrl } from "../config/api";
import { thoughtStreamService } from "./thoughtStreamService";

export interface IngestionResult {
  success: boolean;
  skillName?: string;
  description?: string;
  error?: string;
}

class SkillIngestionService {
  constructor() {
    console.log("[SKILL_INGESTION] Initialized");
  }

  /**
   * Ingest a URL and automatically generate/register a skill
   */
  async ingestAndRegister(url: string): Promise<IngestionResult> {
    thoughtStreamService.pushThought("ACTION", `Starting autonomous skill ingestion from: ${url}`);
    
    try {
      // 1. Scraping / Analysis Phase
      thoughtStreamService.pushThought("REASONING", `Analyzing content at unique source: ${url}`);
      const scrapeResponse = await fetch(apiUrl("/api/knowledge/scrape"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });

      if (!scrapeResponse.ok) {
        throw new Error(`Failed to scrape URL: ${scrapeResponse.statusText}`);
      }

      const content = await scrapeResponse.json();
      thoughtStreamService.pushThought("OBSERVATION", `Successfully ingested ${content.text?.length || 0} characters of documentation.`);

      // 2. Generation Phase
      thoughtStreamService.pushThought("REASONING", "Extracting core capabilities and generating execution logic.");
      const generateResponse = await fetch(apiUrl("/api/skills/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: `Extracted from URL: ${url}\n\nContext: ${content.text?.substring(0, 5000)}`,
          language: "python" // Default for robustness
        })
      });

      if (!generateResponse.ok) {
        throw new Error("Skill generation failed.");
      }

      const skillData = await generateResponse.json();
      thoughtStreamService.pushThought("OBSERVATION", `Generated new skill: ${skillData.name}`);

      // 3. Registration Phase
      thoughtStreamService.pushThought("ACTION", `Registering ${skillData.name} to the active capability registry.`);
      const registerResponse = await fetch(apiUrl("/api/skills/create"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: skillData.name,
          description: skillData.description,
          script: skillData.code,
          language: skillData.language,
          inputs: skillData.inputs
        })
      });

      if (!registerResponse.ok) {
        throw new Error("Skill registration failed.");
      }

      thoughtStreamService.pushThought("PLAN", `Skill ${skillData.name} is now READY for use. I can perform tasks associated with this URL.`);
      
      return {
        success: true,
        skillName: skillData.name,
        description: skillData.description
      };

    } catch (e: any) {
      const errorMsg = e.message || "Unknown error during ingestion";
      thoughtStreamService.pushThought("WARNING", `Ingestion failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }
}

export const skillIngestionService = new SkillIngestionService();
export default skillIngestionService;
