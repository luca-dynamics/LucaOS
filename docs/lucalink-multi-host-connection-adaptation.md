# LucaLink Multi-Host Connection Architecture + Host Adaptation Intelligence

LucaLink is an adaptive host mesh that lets Luca discover, diagnose, and safely plan bridge software for new digital, display, sensor, electronics, and embodied hosts. The mesh is host/kernel/body aware and is not desktop/mobile-only.

This PR is model-first and side-effect-free. It does not execute generated code, write generated files, install adapters, open sockets, scan networks, add backend endpoints, add persistence, or change pairing, guest, PIN, WebRTC, mission sync, sensor pulse, relay/local/VPN behavior, or runtime enforcement.

## Purpose

LucaLink now models connected hosts beyond a desktop/mobile pairing shape. The connection model can describe desktop/laptop Primary Host and execution hosts, companion mobile/tablet hosts, watch hosts, TV and web-display hosts, guest hosts, sensor hosts, electronics/IoT hosts, embodied hosts, and unknown hosts that need additional authorized diagnosis.

## Host classes

Host classes identify the role a Luca-capable host may play in the mesh:

- `primary-host` — the current user-authorized Primary Host boundary.
- `companion-host` — mobile/tablet style companions.
- `execution-host` — trusted desktop/laptop/dev-capable hosts, still governed by runtime enforcement.
- `display-host`, `tv-host`, `web-display-host`, `watch-host` — display or companion surfaces with conservative approval limits.
- `guest-host` — guest conversation/WebRTC-limited surfaces.
- `sensor-host` — read-only sensing hosts.
- `electronics-host` — smart electronics / IoT style hosts, read-only by default.
- `embodied-host` — robots, drones, humanoids, or similar bodies; physical action is denied by default.
- `unknown-host` — unclassified hosts that require Host Adaptation Intelligence diagnosis.

## Connection classes

The model can classify relay socket, local LAN, VPN, WebRTC, web display, guest web, companion bridge, nearby BLE, sensor stream, electronics bridge, embodied bridge, offline cached, and unknown connection classes. These are records and plans only; this PR adds no transport implementation.

## Runtime surfaces

Runtime surfaces include native desktop, native mobile, browser, kiosk browser, smart watch, smart TV, smart electronics, embedded Linux, Python runtime, Node runtime, Electron runtime, IoT API, MQTT, Matter-like, ROS-like, serial, camera stream, sensor stream, and unknown.

## Eligibility derivation

Each host connection record derives:

- reachability: online, nearby, relay reachable, local reachable, limited, offline, or unknown;
- presence: strong/weak user presence, display-only, sensor-only, unattended, public surface, or unknown;
- approval capability: none, display-only, deny-only, low risk, low/medium risk, high-risk with Primary Host escalation, or Primary Host only;
- risk: low, medium, high, or critical;
- eligibility booleans for display, approval, execution, sensing, physical action, handoff, and Luca UI hosting.

Physical action is false by default. Embodied hosts cannot approve their own physical actions. Any future motion, smart-home control, payment, or other physical-world behavior requires fresh Primary Host confirmation and later execution controls.

## Host Adaptation Intelligence

Host Adaptation Intelligence models authorized diagnosis and bridge planning for unknown or newly classified hosts. It can produce:

- diagnosis summaries;
- bridge strategy plans;
- blueprint records;
- pseudo-code/config sketches;
- sandbox/static-check/test-plan records;
- Primary Host approval checklists;
- denied capability boundaries.

Generated adapters are blueprints only in this PR and are not executed, installed, written to disk, sent over network, or connected.

## Bridge strategy types

Supported model strategies include:

- Web Display Bridge;
- Python Host Agent;
- Node Host Adapter;
- Electron Host Adapter;
- IoT API Bridge;
- MQTT Bridge;
- Matter-like Bridge;
- ROS Sensor Bridge;
- Serial Sensor Bridge;
- Companion Watch Bridge;
- Kiosk Display Bridge;
- Manual Setup Guide;
- Unsupported.

## Examples

### Web Display Bridge

For browser, kiosk, smart TV, or big-display hosts, Luca can model a display-only bridge blueprint with QR/link/WebRTC/WebSocket concepts. This PR does not add signaling, socket, or WebRTC behavior.

### Python Host Agent

For Python runtime, embedded Linux, Raspberry Pi, or robotics-board style hosts, Luca can model a Python host-agent blueprint. Generated program execution is disabled by default, sandbox checks are required, and shell execution is not introduced.

### IoT / MQTT bridge

For IoT API, MQTT, or Matter-like hosts, Luca can model read-only bridge profiles and capability boundaries. Control actions are denied by default and require future fresh-confirmation controls.

### ROS / Sensor bridge

For ROS-like, serial, robotics, or sensor hosts, Luca can model sensor-read blueprints and telemetry schema sketches. Motion and actuation are denied by default, and an embodied host cannot self-approve physical behavior.

## Safety boundaries

Allowed in this PR:

- bridge plans;
- pseudo-code;
- config sketches;
- sandbox/static-check/test plans;
- approval checklists;
- capability boundaries;
- reusable host profile proposals;
- read-only Device Center visibility.

Not allowed in this PR:

- credential bypass;
- exploit generation;
- stealth installs;
- malware-like persistence;
- unauthorized access;
- scraping secrets;
- defeating authentication;
- physical actuation;
- payment actions;
- running generated code;
- writing generated files;
- opening sockets;
- modifying system settings;
- live probing;
- BLE, Matter, MQTT, ROS, WebRTC, relay, local, VPN, guest, PIN, pairing, or mission-sync transport changes.

## Next step

The next natural step is a Multi-Host Approval Surface that can review model-only host bridge blueprints, route them through Primary Host approval, and prepare sandbox/static checks before any future controlled execution work.
