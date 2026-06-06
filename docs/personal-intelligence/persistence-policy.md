# Personal Intelligence Persistence Policy

PR #208 evaluates whether a Personal Intelligence persistence proposal is safe to review. It does not grant write access and does not connect a storage adapter.

## Privacy-zone rules

| Zone         | Proposal review              | Explicit user approval                                                      |
| ------------ | ---------------------------- | --------------------------------------------------------------------------- |
| `public`     | May be proposed              | Governed review remains required                                            |
| `project`    | May be proposed              | Governed review remains required                                            |
| `private`    | May be reviewed under policy | Required unless policy explicitly allows private proposal review without it |
| `credential` | Sensitive review only        | Always required                                                             |
| `financial`  | Sensitive review only        | Always required                                                             |
| `health`     | Sensitive review only        | Always required                                                             |
| `enterprise` | Sensitive review only        | Always required                                                             |

Allowing private **proposal review** does not allow persistence. The proposal continues to report `writePerformed: false`.

## Validation and blocking

A proposal is blocked when required source or identity fields are absent, confidence is outside `0..1`, proposal dates are invalid, memory path/content previews are absent, or serialized previews appear to include:

- hidden prompts;
- private reasoning or chain-of-thought;
- raw file, attachment, or document contents;
- password, passphrase, API-key, access-token, or private-key material.

Low-confidence proposals require review. Sensitive zones produce operator-visible warnings. Policy output is a pure value and performs no logging, persistence, network access, execution, or runtime mutation.

## Approval semantics

Approval metadata must represent explicit user approval. The only approval status in this layer is `approved_for_future_adapter`. It is deliberately not named `approved_to_write`. No memory is written, no learning event is persisted, and no storage adapter is connected by approval.
