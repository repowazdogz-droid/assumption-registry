# Release Notes

## 2.0.0 - 2026-04-26

ARP-2.0 schema-focused pre-action governance upgrade.

- Added required v2 criticality classification: `load_bearing` and `peripheral`.
- Added structured `TestabilityMetadata` for verification status, method, evidence, acceptance criteria, timing, and verifier.
- Added first-class typed dependency edges: `derives_from`, `constrains`, `refines`, and `contradicts`.
- Added pre-action gate reports for unverified or expired load-bearing assumptions.
- Added backward-compatible read support for ARP-1.0 snapshots with deterministic migration to ARP-2.0 exports.
- Updated registry health and Markdown export with load-bearing risk metrics.
- Rebuilt distributable files from TypeScript source.

## 1.0.1 - 2026-04-26

Release hygiene pass for ARP-1.0.

- Rebuilt distributable files from TypeScript source.
- Verified dependency installation, audit, tests, and build locally.
- Normalised package metadata for npm/GitHub citation.
- Verified MIT license metadata and root LICENSE file.
- Recorded local folder name: assumption-registry-protocol.
- Recorded GitHub repository: repowazdogz-droid/assumption-registry.

No protocol schema or runtime semantics were intentionally changed.
