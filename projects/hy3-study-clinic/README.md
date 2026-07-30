# Hy3 Study Clinic

> A verifiable personal learning graph and an evidence-grounded diagnosis-to-remediation loop, powered by the Hy3 API.

Hy3 Study Clinic is an interactive web application that turns course materials into a verifiable personal learning graph and closes the loop from diagnostic weakness to repaired mastery. A learner gathers one or more documents in a course workspace; Hy3 performs bounded semantic work — concept extraction, grounded question generation, rubric-based short-answer grading, typed graph-relationship proposals, and a bounded graph-grounded Tutor — while deterministic local code verifies every citation against the source text, owns all scoring arithmetic and every final state transition, and persists mastery, mistakes, misconception hypotheses, and review scheduling in SQLite across sessions.

## Project links

- **Repository:** [Small-fish-QAQ/hy3-study-clinic](https://github.com/Small-fish-QAQ/hy3-study-clinic)
- **Full README** (product detail, architecture, setup, limitations): [README.md](https://github.com/Small-fish-QAQ/hy3-study-clinic/blob/main/README.md)
- **Final demo video** (1:53, silent MP4, under the two-minute limit): [hy3-study-clinic-demo.mp4](https://github.com/Small-fish-QAQ/hy3-study-clinic/blob/main/docs/assets/hy3-study-clinic-demo.mp4)
- **License:** [Apache-2.0](https://github.com/Small-fish-QAQ/hy3-study-clinic/blob/main/LICENSE)

[![Personal learning graph with a selected concept, typed relationships, and locally validated source evidence](https://raw.githubusercontent.com/Small-fish-QAQ/hy3-study-clinic/main/docs/assets/02-learning-graph-evidence.png)](https://github.com/Small-fish-QAQ/hy3-study-clinic/blob/main/docs/assets/hy3-study-clinic-demo.mp4)

_The personal learning graph: a selected concept with its typed relationships and locally validated source evidence. Click through for the full demo video._

## Why this is more than a quiz generator

The core of the application is a **verifiable personal learning graph** built from the learner's own course materials. Every model proposal — concepts, questions, graph edges, concept alignments, plan reasons — carries `(blockId, exact quote)` citations that the server re-verifies with exact string matching before anything is persisted. Persistent learner state (mastery, open mistakes, misconception hypotheses, review status) is overlaid on that graph, and a bounded Hy3 Tutor plans against it through a constrained read-only tool loop. Quiz generation is one component of this system, not the product.

## Two end-to-end workflows

**Workflow 1 — course materials to a verifiable learning graph**

1. Import multiple documents into a course workspace; parsing preserves provenance: stable block IDs, character offsets, heading paths, and PDF page ranges.
2. Hy3 extracts grounded concepts, proposes canonical cross-document concept alignments, and proposes typed graph relationships with verbatim evidence.
3. Local validation accepts only edges between existing workspace concepts, with controlled relation types, exactly verified quotes, and an acyclic prerequisite structure.
4. The learner explores the resulting graph in three views and inspects the locally validated evidence behind every concept and relationship.

**Workflow 2 — diagnostic weakness to repaired mastery**

1. A workspace diagnostic assessment is graded by deterministic objective rules plus Hy3 rubric-based semantic grading of short answers.
2. Low-scoring answers create open mistakes in the mistake notebook.
3. A targeted remediation quiz re-tests those concepts; a correctly answered remediation question resolves exactly its linked mistakes.
4. Deterministic local rules update mastery and review scheduling, and the learning-progress view records the change.
5. For a still-weak concept, the bounded graph-grounded Hy3 Tutor inspects learner state, the graph neighborhood, and the prerequisite path, then produces a locally validated learning plan such as `prerequisite_repair`.

Both workflows are reproducible offline with the fake provider: `npm run demo:graph` and `npm run demo:adaptive`.

## Interactive frontend and flagship capabilities

The React + TypeScript web frontend provides:

- **Course workspaces** holding multiple documents — pasted text, Markdown, TXT, PDF, and DOCX — with PDF page-level provenance.
- **Grounded concept extraction** and **canonical cross-document concept alignment**, including bilingual and malformed duplicate names.
- **A locally validated typed concept graph**: a controlled six-relation vocabulary, exact-quote evidence per edge, three graph views, a learner-state overlay, and in-graph evidence inspection.
- **Diagnostic workspace assessment** with deterministic objective grading and Hy3 rubric-based short-answer grading; completed quizzes are kept as read-only history.
- **A mistake notebook with targeted remediation**, deterministic mastery updates, and local review scheduling.
- **A bounded graph-grounded Hy3 Tutor** with prerequisite-path inspection and `prerequisite_repair` planning.
- **Persistent SQLite state** across restarts; a fake-provider offline mode and the real Hy3 online mode share the same runtime-validated contracts.

## What Hy3 does

All model capability is consumed through the Hy3 API; the project performs no training, fine-tuning, or local inference. Hy3 performs bounded semantic work:

- grounded concept extraction;
- grounded question and explanation generation;
- semantic short-answer grading against rubric points;
- typed graph-relationship proposals;
- concept-alignment proposals;
- assessment and remediation proposals;
- misconception hypotheses;
- bounded Tutor decisions and learning-plan proposals.

Every output is an advisory semantic proposal with source citations. Hy3 never directly mutates learner state and does not autonomously control the application: local code validates each proposal and decides what is persisted and acted on.

## What deterministic local code owns

- schema validation of all provider output;
- exact quotation and citation verification;
- document parsing and source-block construction;
- graph and alignment acceptance;
- objective grading;
- final short-answer scores computed from validated rubric coverage;
- total-score arithmetic;
- the mistake lifecycle, mastery updates, and misconception state transitions;
- review scheduling;
- Tutor tool execution under a read-only whitelist with explicit budgets;
- learning-plan validation;
- SQLite persistence and transactions;
- request cancellation and stale-response protection;
- every final state mutation.

## Demo evidence

The final 1:53 video demonstrates, in one continuous sequence:

- PDF import with page-level source evidence;
- the personal learning graph in multiple layouts;
- selected concepts and relationships with locally validated evidence;
- an 81-point diagnostic result and the Hy3 rubric-grading detail behind it;
- a targeted remediation quiz reaching 100 and the source mistake marked resolved;
- the updated learning-progress view;
- a graph-grounded Tutor session inspecting learner state, the graph neighborhood, and the prerequisite path before selecting `prerequisite_repair`.

Annotated screenshots for every stage are in the repository's [evidence section](https://github.com/Small-fish-QAQ/hy3-study-clinic/blob/main/README.md#evidence), including [PDF page-level provenance](https://github.com/Small-fish-QAQ/hy3-study-clinic/blob/main/docs/assets/01-pdf-page-evidence.png), [graph-grounded tutoring](https://github.com/Small-fish-QAQ/hy3-study-clinic/blob/main/docs/assets/03-hy3-graph-tutoring.png), and [Hy3 rubric grading](https://github.com/Small-fish-QAQ/hy3-study-clinic/blob/main/docs/assets/05-hy3-rubric-grading.png).

## CodeBuddy collaboration

CodeBuddy Code, connected to Hy3 through Tencent Cloud TokenHub, performed one focused accessibility and regression review of the source-evidence disclosure. Its accepted contribution is limited to the `SourceEvidencePanel` tests:

- fixed a regression test that kept a detached DOM-node reference after conditional rendering;
- added Enter and Space keyboard-interaction coverage;
- added fallback coverage for unavailable cited source blocks.

CodeBuddy confirmed that the production component already used native button semantics, `aria-expanded`, `aria-controls`, and a stable panel ID; it did not author those attributes and did not stage, commit, or push files.

## Verification

Verified locally at independent-repository `main` commit `2637148`:

| Workspace | Test files | Tests |
| --- | ---: | ---: |
| shared | 5 | 75 |
| server | 36 | 404 |
| web | 16 | 274 |
| **Total** | **57** | **753** |

- Production build: passed
- ESLint: passed
- Prettier: passed
- Final demo: 1:53, under the two-minute limit

## Issue #4 requirement checklist

- [x] Hy3 API used for the production model-backed workflows
- [x] No training, fine-tuning, or local inference
- [x] Interactive Web frontend (React + TypeScript)
- [x] At least two complete end-to-end workflows
- [x] Final demo video under two minutes (1:53)
- [x] Independent open-source repository (Apache-2.0)
- [x] README documents Hy3's responsibilities in the system
- [x] CodeBuddy collaboration documented
- [x] No secrets or local database files committed

## Honest boundaries

- Exact-quote verification proves that cited text exists at the recorded source location; it does not by itself guarantee the semantic truth of model explanations, which the UI labels as model-proposed.
- Mastery is a deterministic weighted heuristic, not a scientific cognitive diagnosis; misconception records are hypotheses that require a discriminating question to confirm.
- The fake provider makes the complete workflow repeatable offline, but generated content and ordering may vary between runs; only local scoring and state rules are deterministic.
- Strict local validation can reject schema-valid model output and require regeneration, so generated graphs and quizzes can contain fewer items than requested.
- A Tutor run that exhausts its explicit budgets fails with zero state changes, by design.

## Related issue

Submission for [Tencent-Hunyuan/Hy3#4](https://github.com/Tencent-Hunyuan/Hy3/issues/4).
