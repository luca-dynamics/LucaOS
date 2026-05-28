# LucaOS Self-Evolution Repo Boundary

## External Lab Import Boundary (Adapter-only)
External lab outputs may be ingested only through `ExternalEvolutionImportAdapter` as inert review objects.

Boundary guarantees:
- ingest/translate only (no execute/apply);
- no optimizer execution;
- no `mutate`/`commit` side effects;
- no runtime behavior replacement;
- no persistence at import time.

Any promotion or application remains a separate Origin-governed step outside this adapter.
