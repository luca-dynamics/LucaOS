# Privacy Zones

Privacy Zones attach explicit sensitivity context to personal intelligence:

- `public`: information safe for public disclosure;
- `project`: information scoped to a project;
- `private`: general personal information;
- `device`: device-specific state and preferences;
- `credential`: secrets and authentication material;
- `financial`: financial accounts, records, or decisions;
- `health`: health and wellbeing information; and
- `enterprise`: organization-controlled information.

A Privacy Policy grants read and write operations independently per zone. Missing grants deny access by default unless the policy explicitly defines a different default. Helpers answer policy questions only; they do not perform data access, override runtime approvals, or imply that a declared skill permission has been granted.
