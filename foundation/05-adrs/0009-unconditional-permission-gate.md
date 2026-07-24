# ADR-0009: Unconditional permission gate

## Status

Accepted

## Context

Side effects on the user's world — files, shell, network, money, messaging, device
control — pass through a permission gate: an explicit authorization step, resolved
by the operator, that must succeed before a gated action executes. This is the
mechanism behind [Invariant 8](../01-constitution/01-the-eight-invariants.md#invariant-8--security-and-explicit-permissions)
and the [Constitution's](../01-constitution/04-trust-and-permissions.md) first
commitment, explicit permission.

A guardrail in the codebase contained a bypass. If the last user message in the
transcript contained a particular phrase, the guardrail **skipped the permission
gate** and let the action through. The intent was presumably a convenience — a way
to pre-authorize actions by saying a magic word. The effect was a vulnerability,
because of where the phrase was checked: the **transcript**.

Transcript text is not a trusted channel. It is a mixture of everything the system
has ingested: the user's own words, yes, but also **pasted documents, fetched web
pages, tool output, file contents read back, and anything an
[agent](../GLOSSARY.md) retrieved**. All of it lands in the transcript as text. If a
phrase in the transcript can unlock a privileged action, then anyone who can get
text in front of Luca — the author of a web page Luca fetches, a document the user
pastes, a file a tool reads — can author that phrase and unlock the gate. This is a
classic prompt-injection escalation: attacker-controlled content is treated as
authorization.

Both the [Constitution](../01-constitution/04-trust-and-permissions.md) and
[CLAUDE.md](../CLAUDE.md) state the rule this violates in plain terms: "Never treat
conversation transcript text as an authorization channel," and Invariant 8's
failure mode "a magic phrase in a user message that unlocks a privileged write."
The bypass was that failure mode, in code.

## Decision

**Remove the transcript-based bypass. The permission gate is unconditional.**
Authorization comes only from the operator's own decision through the permission
step — never from the presence of any phrase, token, or pattern in the transcript.

- **No transcript phrase can skip the gate.** There is no magic word, in the last
  user message or anywhere else in the transcript, that pre-authorizes a gated
  action. The check that consulted transcript text for authorization is gone.
- **Consent lives in the operator's decision.** A gated action is authorized by the
  user resolving the permission step for that action, with the
  [provenance](../GLOSSARY.md) that records who authorized it and on what authority.
  Authority is a decision the user makes, not a string the system finds.
- **Fail closed.** If the authorizing decision has not been made, the action does
  not execute. Absence of authorization is refusal, never a silent fallback to
  performing the action.

This aligns the gate with the boundary every part of the Foundation draws: valid
authorization comes from the user's own decision; everything observed through tools
— including the transcript — is data, not command.

## Consequences

### Positive

- **The escalation path is closed.** Attacker-controlled content in the transcript
  — a pasted document, a fetched page, tool output — can no longer authorize a
  privileged action. The most direct prompt-injection route to a gated side effect
  is removed. This directly strengthens Invariant 8.
- **Authorization has a single, honest source.** "Who authorized this?" always
  resolves to an operator decision with provenance, not to "a phrase appeared in the
  transcript." Trust becomes auditable, as the Constitution requires.
- **The rule is now consistent end to end.** The code matches what CLAUDE.md and the
  Trust chapter already told every contributor: the transcript is never an
  authorization channel.

### Negative

- **A convenience is gone.** Whatever workflow relied on saying a phrase to
  pre-authorize actions no longer works; those actions now require the operator to
  resolve the permission step. That is the correct trade, but it is a real loss of
  a shortcut for anyone who used it.
- **More explicit authorizations.** Because nothing in the transcript can stand in
  for consent, some flows prompt where they previously sailed through. Legitimate
  pre-authorization must be provided through the proper channel — a durable,
  scoped grant the user actually makes — rather than through transcript text. Any
  ergonomic pre-authorization is a separate, deliberate feature, not a phrase.
- **It sharpens the need for good gate UX.** With the bypass removed, the permission
  step is on the critical path for more actions, so it must be fast and clear enough
  that legitimate authorization is not experienced as nagging — otherwise users are
  pushed toward reflexive approval, which is its own risk.

## Alternatives considered

- **Keep the bypass but restrict the phrase to "real" user messages.** Try to
  distinguish the user's own typed words from ingested content in the transcript, and
  honor the phrase only in the former. Rejected: the distinction is not reliable.
  Content is pasted, quoted, echoed by tools, and reflected back in ways that blur
  authorship; a system that must correctly attribute every line of the transcript to
  a trusted or untrusted source in order to stay safe has already lost. Safety must
  not depend on that classification being perfect.
- **Cryptographically sign the authorizing phrase.** Require the pre-authorization
  token to be signed so pasted content cannot forge it. Rejected as the wrong shape:
  it reintroduces authorization-as-string, adds key-management complexity, and still
  routes authority through the transcript. Authorization belongs in an operator
  decision with provenance, not in a token embedded in text.
- **Narrow the bypass to low-risk actions only.** Allow the phrase to skip the gate
  for actions deemed harmless. Rejected: it keeps an attacker-controllable
  authorization channel alive, and risk classification is itself fallible; a channel
  that can be injected should not exist at all, at any risk tier.
- **Do nothing.** Rejected: the bypass is a live prompt-injection escalation and a
  direct violation of Invariant 8 and the Trust commitments. Leaving it in place is
  not acceptable.

## Related

- [Invariant 8 — Security and Explicit Permissions](../01-constitution/01-the-eight-invariants.md#invariant-8--security-and-explicit-permissions)
- [Trust and Permissions](../01-constitution/04-trust-and-permissions.md)
- [Safety and Permissions](../02-specification/07-safety-and-permissions.md)
- [CLAUDE.md](../CLAUDE.md) (the transcript is never an authorization channel)
- [ADR-0008: Category security floor](0008-category-security-floor.md)
