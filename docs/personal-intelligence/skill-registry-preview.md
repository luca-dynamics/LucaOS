# Skill Registry Preview

The preview boundary creates, validates, lists, and renders Skill Manifest metadata. A UI may show identity, version, category, requested permissions, memory policy, required models/tools, workflow descriptions, and manifest tests.

It must not import or resolve `entrypoint`, execute workflow steps or tests, grant requested permissions, call a model/tool, inspect raw files, or access the network. An entrypoint is an inert declaration. PR #209 may add governed manifest loading and listing, still without execution; runtime sandbox design is deferred to PR #214.
