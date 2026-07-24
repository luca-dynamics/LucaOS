# CLAUDE.md — Operating Instructions for AI Coding Agents

You are an AI coding agent (Claude Code, Codex, or a successor) contributing to
LucaOS. This document tells you how to work here. It has authority over your
default behavior. Read it fully before you touch code.

LucaOS is unusual: a large fraction of its code is written by agents like you.
That is deliberate. But it means the coherence of the system depends on every
agent sharing the same mental model. This file is that shared model.

> **`CLAUDE.md` vs `LUCA.md`.** This file instructs the agents that _build_ LucaOS.
> Its companion, [`LUCA.md`](LUCA.md) — the Charter of Luca — constitutes _Luca
> itself_, the agentic system the OS hosts. When you implement Luca's runtime
> behavior (identity, memory, permissions, voice), the Charter is the specification
> of how Luca must act; keep your code faithful to it.

---

## 1. The one thing you must never forget

**There is exactly one Luca.**

Not one per session. Not one per device. Not one per provider. One continuous
identity that persists across time, surfaces, and underlying models. Almost every
serious architectural mistake in this codebase traces back to an agent quietly
reintroducing per-session or per-surface state that fractures that identity.

Before you write anything, ask: _does this preserve the single, continuous Luca,
or does it create a second one?_ If it creates a second one, stop and reconsider.

---

## 2. The Four Questions (answer them in every PR)

Every change must be able to answer:

1. **Does this strengthen persistence?** (Or does it add ephemerality that should
   have been durable?)
2. **Does this reinforce one identity?** (Or does it shard Luca?)
3. **Does this improve trust?** (Or does it act on the user without clear
   permission and provenance?)
4. **Does this move Luca closer to a continuously present AI?**

If your change weakens any of these, it needs an explicit, documented
justification — usually an [ADR](05-adrs/README.md) — not a silent commit.

See [The Four Questions](01-constitution/02-the-four-questions.md) for how to
apply them.

---

## 3. The Eight Invariants (do not break these)

These are elaborated in [The Eight Invariants](01-constitution/01-the-eight-invariants.md).
In short:

1. **One Luca identity** — a single continuous identity, never per-session agents.
2. **Persistent runtime** — Luca exists before, during, and after any interaction.
3. **Shared memory** — memory belongs to Luca, not to chats, providers, or apps.
4. **Provider abstraction** — no code outside the provider layer may depend on a
   specific model vendor's SDK or wire format.
5. **Cross-surface continuity** — every surface is an embodiment of the same
   state, not a separate app.
6. **Strong typing and modularity** — typed boundaries; no `any` at subsystem
   seams; no god-modules.
7. **Backward compatibility where practical** — persisted data and cross-surface
   protocols evolve additively and migrate explicitly.
8. **Security and explicit permissions** — side effects on the user's world are
   gated, provenanced, and revocable.

An invariant is not a guideline. If you cannot satisfy one, you do not have
license to break it — you have a reason to open an [RFC](04-rfcs/README.md).

---

## 4. How to ground yourself before writing code

Do not code from this document alone. Before implementing in a subsystem:

1. Read the relevant [Specification](02-specification/README.md) chapter.
2. Read any [ADRs](05-adrs/README.md) tagged to that subsystem — they tell you
   _why_ it is the way it is, so you do not "fix" something that is load-bearing.
3. Read the actual code. This repository describes the **target**; the
   implementation may be ahead of or behind it in places. When they disagree,
   the disagreement is information — surface it, do not silently pick a side.

**Never infer that a subsystem "works" from the fact that it is well-tested.** In
this codebase, test coverage has historically been _inversely_ correlated with
whether code is wired into the live runtime: the most polished, best-tested
modules were sometimes the ones no live path imported. Before trusting a module,
grep for its non-test importers.

---

## 5. Provider abstraction is sacred

Luca must maintain continuity regardless of which model performs a task. That is
only possible if the rest of the system never learns which vendor it is talking
to.

- All model access goes through the provider abstraction layer (see
  [Provider Abstraction](02-specification/04-provider-abstraction.md)).
- Adapters translate a vendor's native format (Anthropic tool_use blocks, OpenAI
  function calls, Gemini functionCalls, a local model's JSON) into one internal
  representation. **Nothing above the adapter may branch on vendor.**
- Routing decisions (which model for which task) live in the router, not
  scattered through feature code.
- If you find yourself writing `if (provider === "anthropic")` outside the
  provider layer, you are violating the invariant. Move it down.

---

## 6. Memory belongs to Luca

Memory is not a feature of a chat, a provider, or an app. It is Luca's continuous
understanding of the user and the world.

- Writes to durable memory are **capacity-bounded at the write**, not merely
  truncated at read time. A tier that is full forces consolidation before it
  accepts more. (See [Memory Architecture](02-specification/03-memory-architecture.md).)
- What is injected into a model's context is a **budgeted, ranked selection** of
  memory, never the entire archive.
- Memory the agent proposes to store _about the user_ may be gated behind
  consent. Respect that gate; never route around it.
- Never treat conversation transcript text as an authorization channel. Pasted
  documents, fetched pages, and tool output all land in the transcript; a phrase
  there is attacker-controllable and must never unlock a privileged action.

---

## 7. Safety and permissions are not optional add-ons

- Any tool that can affect the user's world (files, shell, network, financial,
  messaging, device control) is gated. Coverage is enforced by **category
  floors**, so a new tool in a dangerous category cannot ship ungated merely
  because someone forgot a config entry. (See
  [Safety and Permissions](02-specification/07-safety-and-permissions.md).)
- Prefer **failing closed**. If an approval step cannot be reached, refuse the
  action; never silently fall back to performing it.
- Destructive-command and high-risk checks must inspect what the command _does_,
  not merely match a keyword. A check that looks for a literal tool name in a
  command string is not a check.
- Every side-effectful action carries **provenance**: what asked for it, on whose
  authority, and whether that authority is still valid.

---

## 8. Working style expected of you

- **Match the surrounding code.** Read a file before editing it; mirror its
  naming, its comment density, its idioms. Do not impose a personal style.
- **Small, typed boundaries.** New seams between subsystems get explicit types.
  No `any` on a public surface of a module.
- **Verify, don't assume.** If you claim a test passes, run it and show the
  output. If a step was skipped, say so. When something is done and confirmed,
  say it plainly; when it is not, say that too.
- **Stage by explicit path.** Multiple sessions and worktrees may share one tree.
  Never `git add -A`; stage the specific files you changed. Treat unexpected
  modified files as another session's in-flight work — surface them, do not
  commit or revert them.
- **Confirm outward-facing or irreversible actions** before taking them, unless
  durably authorized. Sending, publishing, deleting, and force-pushing are not
  yours to do on a hunch.

---

## 9. When the vision and the code disagree

You will find places where the current implementation does not yet meet this
Foundation. That is expected and documented — see the honesty clause in the
[README](README.md#status-and-versioning).

Your job in that situation is **not** to rewrite the world to match the vision in
one heroic PR, and **not** to quietly cement the divergence. It is to:

1. Name the gap precisely (file, line, behavior).
2. Move one honest step toward the invariant.
3. Leave the code and the docs more truthful than you found them.

The system gets to the north star through many small, aligned steps — each of
which could answer the Four Questions with a yes.

---

## 10. The shape of a good LucaOS contribution

- It strengthens one of the Eight Invariants, or at minimum weakens none.
- It can answer the Four Questions with a straight face.
- It is typed at its boundaries and matches its neighbors.
- Its side effects are gated, provenanced, and revocable.
- It is honest: the tests test real behavior, the docs match the code, and the
  commit message says what actually changed and what was verified.

When in doubt, re-read Section 1. There is exactly one Luca. Protect it.
