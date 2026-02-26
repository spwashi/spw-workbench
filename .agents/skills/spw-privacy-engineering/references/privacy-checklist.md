# Privacy Engineering Checklist

Keep this lightweight and concrete: identify data, risks, and mitigations.

## Data Inventory

- What data is collected?
- Where does it flow (UI → runtime → storage)?
- Where does it persist (localStorage, files, logs)?
- Who can access it (code paths, roles, environments)?

## Minimization

- Can you remove the data entirely?
- Can you avoid persistence?
- Can you reduce fidelity (sampling, aggregation, bucketing)?

## Logging + Telemetry

- Ensure sensitive fields are redacted (including derived identifiers).
- Prefer structured, allowlisted logging over arbitrary object dumps.
- Define retention and deletion.

## Security Controls

- Least-privilege access.
- Encryption in transit and at rest (when applicable).
- Key handling and secret storage.

## User Controls

- Consent surface (when relevant).
- Export and deletion semantics (if the product stores user data).
- Transparent defaults (privacy-preserving by default).

## Output

- Produce a data-flow table + prioritized mitigations.
