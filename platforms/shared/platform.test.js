import { describe, expect, it } from 'vitest';
import platformUtils from './platform.cjs';

const {
  findAvailableExecutable,
  getDefaultLocalModelPaths,
  getNodeCandidates,
  getNodeExecutableCandidatesFromRoot,
  getPlatformInfo,
  getPythonCandidates,
  getVenvExecutable,
  normalizeExecutableName,
} = platformUtils;

describe('platform utilities', () => {
  it('distinguishes native Windows, Linux, macOS, and WSL', () => {
    expect(getPlatformInfo({ platform: 'win32', release: '10.0', env: {} })).toMatchObject({ isWindows: true, isWSL: false });
    expect(getPlatformInfo({ platform: 'darwin', release: '24.0', env: {} })).toMatchObject({ isMacOS: true, isWSL: false });
    expect(getPlatformInfo({ platform: 'linux', release: '6.8.0', env: {} })).toMatchObject({ isLinux: true, isWSL: false });
    expect(getPlatformInfo({ platform: 'linux', release: '6.1.0-microsoft-standard-WSL2', env: {} })).toMatchObject({ isLinux: true, isWSL: true });
  });

  it('normalizes executable and virtual-environment paths by platform', () => {
    expect(normalizeExecutableName('python', 'win32')).toBe('python.exe');
    expect(normalizeExecutableName('python.exe', 'win32')).toBe('python.exe');
    expect(normalizeExecutableName('python3', 'linux')).toBe('python3');
    expect(getVenvExecutable('C:\\Luca\\venv', 'python', 'win32')).toContain('Scripts');
    expect(getVenvExecutable('/opt/luca/venv', 'python', 'linux')).toBe('/opt/luca/venv/bin/python');
  });

  it('returns platform-specific Python fallbacks and Ollama locations', () => {
    expect(getPythonCandidates({ platform: 'win32', projectRoot: 'C:\\Luca', homeDir: 'C:\\Users\\luca' }).at(-1)).toBe('python');
    expect(getPythonCandidates({ platform: 'linux', projectRoot: '/opt/luca', homeDir: '/home/luca' }).at(-1)).toBe('python3');
    expect(getDefaultLocalModelPaths({ platform: 'win32', homeDir: 'C:\\Users\\luca', env: { LOCALAPPDATA: 'C:\\Users\\luca\\AppData\\Local' } }).ollamaExecutable).toContain('Ollama');
  });

  it('returns Luca-owned Node runtime candidates before PATH fallback', () => {
    const candidates = getNodeCandidates({
      platform: 'win32',
      projectRoot: 'C:\\Luca',
      homeDir: 'C:\\Users\\luca',
      resourcesPath: 'C:\\Luca\\resources',
      env: { LUCA_NODE_BIN: 'C:\\Pinned\\node.exe' },
    });

    expect(candidates[0]).toBe('C:\\Pinned\\node.exe');
    expect(candidates).toContain('C:\\Luca\\resources\\bin\\node.exe');
    expect(candidates).toContain('C:\\Users\\luca\\.luca\\runtime\\node\\node.exe');
    expect(candidates).toContain('C:\\Luca\\.luca\\runtime\\node\\node.exe');
    expect(candidates.at(-1)).toBe('node.exe');
  });

  it('expands portable Node roots by platform', () => {
    expect(getNodeExecutableCandidatesFromRoot('/opt/luca/runtime', 'linux')).toEqual([
      '/opt/luca/runtime/node',
      '/opt/luca/runtime/node/bin/node',
      '/opt/luca/runtime/bin/node',
    ]);
    expect(getNodeExecutableCandidatesFromRoot('C:\\Runtime', 'win32')).toEqual([
      'C:\\Runtime\\node.exe',
      'C:\\Runtime\\node\\node.exe',
      'C:\\Runtime\\node\\bin\\node.exe',
    ]);
  });

  it('selects the first existing absolute candidate or PATH fallback', () => {
    expect(findAvailableExecutable(['/missing/python', '/ready/python', 'python3'], (candidate) => candidate === '/ready/python')).toBe('/ready/python');
    expect(findAvailableExecutable(['/missing/python', 'python3'], () => false)).toBe('python3');
  });
});
