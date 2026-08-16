/**
 * Load orb-design TypeScript modules from a plain Node script.
 *
 * Node 24 strips types on import, so no build step and no bundler is involved —
 * the scripts read exactly the same source the tests and the renderer do. The
 * only thing Node is missing is TypeScript's extensionless resolution, which
 * `ts-resolve-hooks.mjs` supplies.
 */

import { register } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

register('./ts-resolve-hooks.mjs', import.meta.url);

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const REPO_ROOT = repoRoot;
export const ORB_DESIGN_SRC = path.join(repoRoot, 'packages', 'luca-orb-design', 'src');

/**
 * @param {string} relativeToSrc Path under `packages/luca-orb-design/src`.
 * @returns {Promise<Record<string, unknown>>}
 */
export async function loadOrbDesignModule(relativeToSrc) {
  return import(pathToFileURL(path.join(ORB_DESIGN_SRC, relativeToSrc)).href);
}
