# Windows Compatibility Audit

**Status:** preparation in progress; native Windows development and packaging are not yet release-ready.

This audit covers repository state after PR #233. It intentionally avoids dashboard shell, header, and panel UI work. The changes here preserve macOS/Linux behavior while removing a small set of high-confidence Windows blockers from development scripts and Electron runtime discovery.

## Readiness summary

| Area | Native Windows | WSL | macOS/Linux |
| --- | --- | --- | --- |
| Vite UI development | Expected to work | Expected to work | Existing supported path |
| Node server | Expected to work with Node dependencies installed | Expected to work | Existing supported path |
| Cortex development startup | Improved; uses `venv\\Scripts\\python.exe`, then `python` | Uses Linux venv layout and `python3` | Existing venv layout preserved |
| Electron development startup | Improved; no POSIX `unset` syntax | Run Electron on the Windows host, not inside WSL | Existing behavior preserved |
| Cortex standalone build | Script is now shell-independent, but requires a platform-local Python environment and PyInstaller validation | Produces Linux, not Windows, binaries | Existing intent preserved |
| Electron packaging | Configuration declares NSIS, but Windows artifacts and native modules remain unverified | WSL cannot produce a representative native Windows package | macOS/Linux targets remain configured |
| System-control and hardware features | Partial; many capabilities are macOS-specific or require Windows implementations | Linux capability set; Windows host hardware access is not implied | macOS remains the most complete target |

## Assumptions found

### Package and development scripts

- `npm run cortex` directly invoked `./cortex/python/venv/bin/python3`, which cannot resolve a Windows virtual environment and was stricter than the Electron/bootstrap code.
- Electron development scripts used `unset ELECTRON_RUN_AS_NODE`, a POSIX shell builtin unavailable to `cmd.exe`.
- Cortex build and cleanup scripts were invoked as Bash executables. The build script relied on `source`, `/bin/bash`, shell redirection, and Unix venv layout. Cleanup relied on `lsof`, `xargs`, and `kill -9`.
- Android release builds directly invoked `./gradlew`; Windows requires `gradlew.bat`.
- The iOS build invokes `xcodebuild` and is intentionally macOS-only.

### Runtime and filesystem

- Electron already used `path.join` for most application data, resource, and entry-point paths.
- Shared Cortex path configuration already distinguished `Scripts/python.exe` from `bin/python`, but the Electron startup path subsequently rewrote any Windows string containing `python`. A valid `python.exe` path could therefore become `python.exe.exe`.
- Command discovery was executed through a shell-built `where/which` string. Besides quoting differences, accepting arbitrary command text made shell behavior part of a simple availability check.
- Native Windows, Linux, and WSL were not represented by one reusable platform abstraction. WSL must be treated as Linux for executable and filesystem layout even when it interoperates with a Windows host.
- Several Electron features remain explicitly macOS-only (AppleScript, Darwin verification, and platform-specific device/system control). Those are feature gaps, not safe candidates for emulation in this stabilization change.

### Local models and Ollama

- Ollama's model directory is normally under `~/.ollama/models` on all three desktop families, but the installed executable location differs.
- A common native Windows installation is under `%LOCALAPPDATA%\\Programs\\Ollama\\ollama.exe`; macOS app installs commonly expose an executable inside the app bundle; Linux installations commonly expose `ollama` through `PATH` or `/usr/local/bin`.
- An Ollama daemon running on the Windows host is not automatically the same runtime as an Ollama daemon installed inside WSL. Networking and model storage should be configured deliberately rather than sharing paths across the Windows/WSL boundary.

## Safe fixes made

1. Added a dependency-free shared platform utility that:
   - distinguishes macOS, native Windows, Linux, and WSL;
   - normalizes executable names without double-appending `.exe`;
   - constructs virtual-environment executable paths with `path.join`;
   - returns project, managed, and system Python candidates;
   - documents default Ollama model/executable locations.
2. Reused the shared virtual-environment helper in Cortex server path configuration.
3. Fixed Electron Cortex startup so it selects an existing venv executable without mutating a valid Windows filename.
4. Replaced shell-string command discovery with argument-based `spawn` of `where.exe` or `which`, including conservative command-name validation.
5. Replaced the package-level Cortex launcher with a Node launcher that selects the correct platform interpreter and passes environment variables through the spawn API.
6. Replaced the Electron development `unset`/`wait-on` chain with a Node TCP wait-and-launch script that removes `ELECTRON_RUN_AS_NODE` through the child environment object.
7. Added shell-independent Node entry points for Cortex/PyInstaller builds, development-port cleanup, and Android's platform-specific Gradle wrapper.
8. Added focused tests for platform detection, WSL detection, executable normalization, venv layout, Python fallback selection, and Ollama locations.

## Remaining blockers

- **No native Windows CI lane:** type-checking and utility tests on Linux do not validate path casing, process semantics, native modules, antivirus interaction, or NSIS output on Windows.
- **Native dependencies:** `better-sqlite3`, `robotjs`, `active-win`, Electron rebuilds, Playwright browsers, and media/ML dependencies need clean Windows install and rebuild testing.
- **Packaged Cortex resource:** `extraResources` currently names `cortex/python/dist/cortex`. A Windows package needs a verified `cortex.exe` build and platform-specific resource mapping before it can be considered shippable.
- **Provisioning parity:** both `setup_vision.ps1` and `setup_vision.sh` exist, but dependency installation, Python version discovery, execution policy, long paths, and paths containing spaces need native Windows QA.
- **System integrations:** Wi-Fi scanning, AppleScript actions, Darwin verification, process repair, screen/audio capture, and hardware control have platform-specific branches or macOS-only implementations.
- **Cleanup portability:** Windows cleanup uses PowerShell and Unix cleanup still requires `lsof`. This is a clearer guarded implementation, not a dependency-free process ownership API.
- **Case sensitivity:** a full import-case audit should be run on a case-insensitive Windows checkout and a case-sensitive CI filesystem. Git's `core.ignorecase` can hide rename/import mismatches.
- **Docker/Git/Python detection:** availability varies by `PATH`, Windows Store aliases, Docker Desktop integration, and whether commands are installed on the host or in WSL.
- **iOS builds:** remain macOS-only by design.

## Native Windows versus WSL guidance

- Use **native Windows** for Electron development, NSIS packaging, native Node module rebuilds, Windows screen/audio/device integration, and final QA.
- Use **WSL** as a Linux development environment. It should select Linux executables (`bin/python`, `python3`) and produce Linux artifacts.
- Do not point a Windows Electron process at a WSL virtual environment, or a WSL process at `venv\\Scripts\\python.exe`.
- Avoid developing the same dependency tree interchangeably from Windows and WSL. Keep separate `node_modules`, Python venvs, and native build outputs.
- Prefer a repository location in the native filesystem of the active environment. Cross-boundary mounts can introduce slower file watching, permission differences, and casing surprises.
- Decide explicitly whether Ollama runs on Windows or inside WSL. Use its HTTP endpoint for cross-environment access; do not assume the model directories are safely interchangeable.

## Recommended Windows QA checklist

1. Clone to a path containing spaces and enable Git long-path support if required.
2. Install an approved Node and Python version from a non-Store source; verify `node`, `npm`, `python`, `git`, and optional Docker commands from a fresh PowerShell session.
3. Run `npm ci`, then verify Electron native module rebuild output.
4. Run `npm run type-check`, focused platform tests, lint, and the normal unit suite.
5. Run `npm run dev`, `npm run server`, and `npm run cortex` independently.
6. Run `npm run electron:dev`; confirm the Vite wait, Electron launch, shutdown, and child cleanup behavior.
7. Create a fresh Python venv through the PowerShell provisioner and repeat Cortex startup with a user path containing spaces.
8. Install/start Ollama on Windows, verify daemon discovery, model listing, pull, inference, restart, and offline behavior.
9. Test Windows Defender/firewall prompts, localhost ports, screen/audio permissions, tray behavior, window restore across multiple displays, sleep/resume, and clean uninstall.
10. Build Cortex on Windows and verify the emitted `cortex.exe` independently.
11. Update the Electron resource mapping for the verified Windows binary, build the NSIS target, install on a clean Windows VM, and verify packaged resource paths.
12. Repeat representative tests in WSL, confirming they use Linux venvs/artifacts and are not mistaken for native Windows validation.

## Electron packaging notes

The package configuration declares `dmg`, `nsis`, and `AppImage` targets. Declaring an NSIS target does not establish Windows readiness. Packaging must be performed with Windows-compatible native dependencies and a Windows Cortex binary. Platform-specific `extraResources` should only be changed after the binary naming and build pipeline are validated on native Windows; guessing at resource layout in a Linux-only audit would risk breaking existing packages.
