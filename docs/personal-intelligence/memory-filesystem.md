# Memory Filesystem Model

A Memory Item is a readable unit of personal intelligence with a kind, title, content, source, normalized confidence, privacy zone, tags, optional project relation, and timestamps. Supported kinds cover identity, preferences, projects, decisions, learning, people, companies, devices, and runtime events.

The in-memory store is deterministic and suitable for tests or future adapter boundaries. The filesystem model is serialization-only: it produces stable paths such as `project/decision/decision-1.json` and readable JSON or Markdown content. It does **not** access local storage, Node filesystem APIs, databases, or production runtime persistence.

Future persistence adapters should preserve privacy-zone metadata, validate content before writes, use atomic writes, and obtain governed authorization independently of serialization.
