/**
 * Module resolution hook: retry a failed relative import with a TypeScript
 * extension.
 *
 * Node 24 strips types natively but keeps its own resolver, which has no
 * extension search. The orb-design sources are written the way the rest of the
 * repo writes TypeScript — `from './master-contour'` — so a plain `import()`
 * from a script fails on the second hop. This adds the one rule TypeScript has
 * and Node does not, and nothing else.
 */

const TS_CANDIDATES = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const relative = specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/');
    if (error?.code !== 'ERR_MODULE_NOT_FOUND' || !relative) throw error;
    for (const candidate of TS_CANDIDATES) {
      try {
        return await nextResolve(specifier + candidate, context);
      } catch {
        // Try the next extension; rethrow the original failure if none resolve.
      }
    }
    throw error;
  }
}
