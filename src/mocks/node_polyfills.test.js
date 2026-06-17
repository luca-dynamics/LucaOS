// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import nodePolyfills, { randomBytes } from './node_polyfills.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('browser-safe crypto polyfill', () => {
  it('returns the requested number of bytes using Web Crypto', () => {
    const getRandomValues = vi.spyOn(globalThis.crypto, 'getRandomValues');

    const bytes = randomBytes(16);

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes).toHaveLength(16);
    expect(getRandomValues).toHaveBeenCalledOnce();
    expect(getRandomValues).toHaveBeenCalledWith(bytes);
  });

  it('returns byte arrays of the requested length on repeated calls', () => {
    expect(randomBytes(8)).toHaveLength(8);
    expect(randomBytes(24)).toHaveLength(24);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid size %s',
    (size) => {
      expect(() => randomBytes(size)).toThrow(
        new TypeError('randomBytes size must be a non-negative number'),
      );
    },
  );

  it('includes randomBytes in the default export', () => {
    expect(nodePolyfills.randomBytes).toBe(randomBytes);
  });
});
