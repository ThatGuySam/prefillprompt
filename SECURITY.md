# Security Policy

- `Tease:` Report vulnerabilities privately.
- `Lede:` Do not place suspected vulnerabilities, credentials, personal data, or
  exploit details in a public issue or discussion.
- `Why it matters:`
  - Coordinated handling protects users while the problem is understood and
    repaired.
- `Go deeper:`
  - Use GitHub private vulnerability reporting when it is enabled.
  - Otherwise contact the repository owner through an already established
    private channel.

## Supported versions

Until the project documents released versions, only the current default branch
is supported.

## Reporting

Include:

- the affected revision and environment;
- minimum reproducible steps;
- observed and expected behavior;
- impact and exposure;
- any logs or artifacts after removing secrets and personal data.

Do not test against systems, accounts, or data you are not authorized to use.
Do not rotate, revoke, publish, or otherwise mutate credentials unless the
repository owner explicitly requests that action.

## Response states

Security work uses the same precise states as other releases: reproduced,
fixed locally, committed, pushed, deployed, and live-verified are separate
claims.
