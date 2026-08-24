/** PROTOTYPE ONLY: zero-transform static server for the Living Orb comparison. */
import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const files = new Map([
  ["/", "living-orb-prototype.html"],
  ["/living-orb-prototype.html", "living-orb-prototype.html"],
  ["/prototypes/living-orb-preview.js", "public/prototypes/living-orb-preview.js"],
  ["/prototypes/living-orb-preview.css", "public/prototypes/living-orb-preview.css"],
  ["/prototypes/living-orb-reference.png", "packages/luca-orb-design/references/luca-living-orb-master.png"],
  ["/prototypes/living-orb-canonical-360.png", "packages/luca-orb-design/references/luca-living-orb-canonical-360.png"],
]);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
};

createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  const relativePath = files.get(pathname);
  if (!relativePath) {
    response.writeHead(404).end("Not found");
    return;
  }
  const filePath = resolve(root, relativePath);
  response.writeHead(200, {
    "Content-Type": mime[extname(filePath)] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(filePath).pipe(response);
}).listen(4180, "127.0.0.1", () => {
  console.log("Living Orb Material Lab V2: http://127.0.0.1:4180/living-orb-prototype.html?variant=idle&tier=hero");
});
