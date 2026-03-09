import { Type } from "@google/genai";
import type { FunctionDeclaration } from "@google/genai";
import { authService } from "../../auth/authService.ts";

// Detect environment
const isElectron =
  typeof process !== "undefined" &&
  process.versions &&
  !!process.versions.electron;
const isNode =
  typeof process !== "undefined" && process.versions && !!process.versions.node;

// --- TOOLS DEFINITION ---
export const tools: FunctionDeclaration[] = [
  {
    name: "visual_scrape_github",
    description:
      "Visually scrape a GitHub repository to extract source code structure and content. Bypasses API rate limits by reading the screen like a human.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        repoUrl: {
          type: Type.STRING,
          description:
            "The full GitHub URL (e.g. https://github.com/owner/repo).",
        },
        maxDepth: {
          type: Type.NUMBER,
          description: "Maximum folder depth to traverse. Default 3.",
        },
      },
      required: ["repoUrl"],
    },
  },
  {
    name: "navigator_login",
    description:
      "Launch a VISIBLE browser window to let the user log in to a service (e.g. WhatsApp, TikTok). Saves the session (cookies) for future autonomous use.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: {
          type: Type.STRING,
          description: "The login URL (e.g. https://web.whatsapp.com).",
        },
        serviceName: {
          type: Type.STRING,
          description:
            "The name to save this session as (e.g. 'whatsapp', 'tiktok').",
        },
      },
      required: ["url", "serviceName"],
    },
  },
];

// --- HANDLER ---
let browserInstance: any = null;

async function getBrowser(headless: boolean = true) {
  if (!isNode && !isElectron) {
    throw new Error(
      "Navigator tools are only available in Desktop/Node environments.",
    );
  }

  const playwright = "playwright";
  const { chromium } = await import(playwright);

  if (browserInstance) {
    if (!headless) {
      await browserInstance.close();
      browserInstance = null;
    }
  }

  if (!browserInstance) {
    browserInstance = await chromium.launch({ headless });
  }
  return browserInstance;
}

export async function handler(name: string, args: any): Promise<any> {
  if (!isNode && !isElectron) {
    return {
      success: false,
      error:
        "Native navigator tools are disabled in the web version. Please use the Electron app for browser automation.",
    };
  }

  if (name === "visual_scrape_github") {
    const { repoUrl, maxDepth = 3 } = args;
    console.log(`[NAVIGATOR] Visual Scrape Initiated: ${repoUrl}`);

    const storedSession = await authService.getSession("github");
    const browser = await getBrowser(true);

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      storageState: storedSession || undefined,
    });

    const page = await context.newPage();
    const collectedFiles: { path: string; content: string }[] = [];
    const visitedUrls = new Set<string>();

    try {
      await page.goto(repoUrl, { timeout: 30000 });

      const crawl = async (currentUrl: string, currentDepth: number) => {
        if (currentDepth > maxDepth) return;
        if (visitedUrls.has(currentUrl)) return;
        visitedUrls.add(currentUrl);

        console.log(
          `[NAVIGATOR] Crawling: ${currentUrl} (Depth ${currentDepth})`,
        );
        await page.goto(currentUrl);

        const links = await page.evaluate(() => {
          const rows = Array.from(
            document.querySelectorAll('a[href*="/blob/"], a[href*="/tree/"]'),
          );
          return rows.map((a) => ({
            href: (a as HTMLAnchorElement).href,
            text: (a as HTMLAnchorElement).innerText,
            type: (a as HTMLAnchorElement).href.includes("/blob/")
              ? "file"
              : "dir",
          }));
        });

        const uniqueLinks = Array.from(
          new Set(links.map((l: any) => JSON.stringify(l))),
        ).map((s: any) => JSON.parse(s));

        for (const link of uniqueLinks) {
          if (link.type === "file") {
            const ext = link.text.split(".").pop() || "";
            if (!["ts", "js", "json", "md", "py", "go", "rs"].includes(ext))
              continue;
            if (link.text.includes("test") || link.text.includes("lock"))
              continue;

            console.log(`[NAVIGATOR] Scraping File: ${link.text}`);
            const filePage = await context.newPage();
            try {
              await filePage.goto(link.href);
              const rawUrl = await filePage.evaluate(() => {
                const btn = Array.from(document.querySelectorAll("a")).find(
                  (a) => a.innerText === "Raw",
                );
                return btn ? (btn as HTMLAnchorElement).href : null;
              });

              if (rawUrl) {
                await filePage.goto(rawUrl);
                const content = await filePage.evaluate(
                  () => document.body.innerText,
                );
                collectedFiles.push({ path: link.text, content });
              }
            } catch {
              console.error(`[NAVIGATOR] Failed to scrape ${link.text}`);
            } finally {
              await filePage.close();
            }
          } else if (link.type === "dir") {
            if (link.href.startsWith(repoUrl)) {
              await crawl(link.href, currentDepth + 1);
            }
          }
        }
      };

      await crawl(repoUrl, 0);

      let output = "";
      for (const file of collectedFiles) {
        output += `--- FILE: ${file.path} ---\n${file.content}\n\n`;
      }

      return {
        success: true,
        fileCount: collectedFiles.length,
        result: output,
      };
    } catch (e: any) {
      console.error(`[NAVIGATOR] Error: ${e.message}`);
      return { success: false, error: e.message };
    } finally {
      await context.close();
    }
  }

  if (name === "navigator_login") {
    const { url, serviceName } = args;
    console.log(
      `[NAVIGATOR] Initiating Login Sequence for: ${serviceName} at ${url}`,
    );

    const browser = await getBrowser(false);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(url);
      console.log(
        `[NAVIGATOR] Login Window Open. Waiting for ${serviceName} session...`,
      );
      await page.waitForTimeout(45000);

      const state = await context.storageState();
      await authService.saveSession(serviceName, state);

      return {
        success: true,
        message: `Session for ${serviceName} saved successfully. You can now close the window.`,
      };
    } catch (e: any) {
      console.error(`[NAVIGATOR] Login Failed: ${e.message}`);
      return { success: false, error: e.message };
    } finally {
      await context.close();
      await browser.close();
      browserInstance = null;
    }
  }

  throw new Error(`Unknown tool: ${name}`);
}
