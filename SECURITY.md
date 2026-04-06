# Security

## Reporting a vulnerability

Please report security issues **privately** to the project maintainer (do not open a
public issue with exploit details).

- Prefer encrypted or private channel agreed with your vendor contact.
- Include: affected version / commit, reproduction steps, impact assessment if known.

## Operational notes

- Never commit **`.env`** or real channel tokens — see **`docs/155`** and **`.env.example`**.
- Notify endpoints and webhook bodies may contain PII — see **`docs/161`**.
