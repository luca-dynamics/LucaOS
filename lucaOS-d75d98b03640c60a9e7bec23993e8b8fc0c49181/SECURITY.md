# 🛡️ Security Policy — Luca OS

## ⚠️ Tactical Warning

Luca OS contains tools for network analysis, vulnerability scanning, and autonomous system interaction.

- **NEVER** run Luca OS with elevated permissions (sudo/admin) unless specifically required for a localized, known task.
- **NEVER** use Luca OS for unauthorized access to third-party systems.

## 🛡️ Responsible Disclosure

If you find a security vulnerability within the Luca OS core itself, please report it privately to:

- **Email**: security@lucaos.ai
- **Expectation**: We will acknowledge and provide a fix timeline within 48 hours.

## 🔒 Data Sovereignty

By default, Luca OS is designed for **Local-First** operation.

- **Memories**: Stored in `luca.db` locally.
- **Cortex**: Can run 100% offline using `Ollama` or local `Gemma` weights.
- **Encryption**: Sensitive credentials in the vault are encrypted at rest.
