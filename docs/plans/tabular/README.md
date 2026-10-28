# Tabular shape contract

Issue: [18](https://github.com/rifandani/ritools/issues/18). Date: 2026-10-26.
Status: reviewable contract and disposable proofs. The assistive-technology and
physical-device gates in [evidence](evidence.md) are still open. This is not a
production Tool or a claim that all acceptance criteria have passed.

The [confirmed plan](../tabular.md) and [ADR-0021](../../adr/0021-tabular-edits-cell-values.md)
remain binding. These documents fix the detailed behavior for engine issue 19
and UI issue 20. They supersede no values-only or local-data boundary.

| Document | Builder uses it for |
| --- | --- |
| [Surface brief](../../../apps/web/.impeccable/surfaces/src-features-tabular.md) | Layout, hierarchy, shared components, responsive behavior |
| [Engine interface](engine-interface.md) | Ownership, schemas, requests, responses, errors, cancellation |
| [Formats](formats.md) | Conversion pairs, types, dialects, sorting, export fidelity |
| [Interactions](interactions.md) | States, focus, editing, selection, history, session lifetime |
| [Copy](copy.md) | Complete paired en-us/id-id message specification |
| [Samples](samples.md) | Sample flows, fixture recipes, licences, provenance |
| [Evidence and decisions](evidence.md) | Versions, measurements, failed checks, release gates |
| [Disposable probes](../../proofs/tabular/README.md) | Repeatable browser and package probes, source templates |

The [Chart View](../tabular.md#chart-view) is a later read-only mode. Its
interaction and copy sections sit in the same documents.

The [engine handoff](engine.md) records the issue 19 implementation, entry points,
format checks, measurements, and remaining UI gates.

## Fixed product behavior

Tabular at `/tabular` lets a person view, edit, and convert one local Table File.
Every Sheet is available. The source file is never overwritten. Work exists in
memory only. A download is a copy, not a saved or persisted session.

The engine owns data, stable identities, Current View, Edit History, and export.
The UI owns control state, logical focus, range selection, and viewport geometry.
Shared state uses application-owned Effect Atoms. The implementation uses Effect
v4. Neither grid nor parser types cross the public interface.

The preferred choices remain React Data Grid and SheetJS CE. A failed proof is a
blocker, not permission to remove a format, range editing, or accessibility.
No production source, route, application package, or lockfile changes belong here.

## Review checklist

- Read the four [surface captures](../../proofs/tabular/evidence/390-light.png)
  through the links in the surface brief.
- Check header changes, filtered insertion, unresolved values, export counts,
  PDF page and character estimates, and cross-Sheet undo against the interface.
- Review the measured failures and pending human/device checks in evidence.
- Do not start production with an assumed pass for a gate marked pending.
