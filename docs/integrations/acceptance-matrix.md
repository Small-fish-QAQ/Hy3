# Issue #2 acceptance matrix

This page is the one-minute reviewer view. The detailed guides remain authoritative for installation, configuration, task steps, and troubleshooting. Structured facts are in [`evidence-manifest.json`](evidence-manifest.json); actual-byte hashes and PNG dimensions are in [`media-integrity.json`](media-integrity.json).

## Exact Issue #2 requirement mapping

| Issue #2 hard requirement | Delivery |
| --- | --- |
| Target `rhinobird2026` | PR #13 targets `rhinobird2026`. |
| At least five tools | Nine tool guides are indexed below. |
| Configuration → first conversation → real task | Every guide contains all three stages; first-conversation and real-task evidence are linked below. |
| Installation and version requirements | Every guide records installation and its exact tested snapshot. |
| Base URL, model, authentication, protocol | Every guide records the tool-specific configuration; shared region details are in [TokenHub setup](tokenhub.md). |
| End-to-end screenshot or GIF | Twenty existing screenshots cover first conversations and real tasks. |
| Common configuration notes | Every guide includes troubleshooting and scoped limitations. |
| `docs/integrations/` index, guides, and media | This directory contains the index, nine guides, shared setup, evidence, and offline verifier. |
| Independent open-source Part B repository + README + demo | [hy3-tokenhub-spec-diff-reviewer](https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer) contains the source, README, current demo, and reports. |
| At least one Hy3 core capability | Part B uses Hy3 semantic reasoning to compare a specification with a supplied or staged diff. |
| Demo at most 60 seconds | The primary Live / Hy3 MP4 is **41.567 seconds**, measured from its container metadata. |

## Nine-tool evidence

<!-- BEGIN GENERATED INTEGRATION TABLE -->
| Tool | Category | Tested snapshot | First conversation | Real task | Guide | Direct evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Aider CLI | CLI coding agent | `0.86.2` | Live verified | Live verified | [guide](aider.md) | [first](assets/aider/aider-first-chat-tokenhub.png) · [task](assets/aider/aider-readme-demo-tokenhub.png) |
| Cline | VS Code extension | `4.0.6` | Live verified | Live verified | [guide](cline.md) | [first](assets/cline/cline-first-chat-tokenhub.png) · [task](assets/cline/cline-readme-demo-tokenhub.png) |
| OpenAI Codex CLI | CLI coding agent | `0.142.5; 0.144.1 check` | Live verified | Live verified | [guide](codex-cli.md) | [first 1](assets/codex-cli/codex-cli-interactive-first-chat-tokenhub.png) · [first 2](assets/codex-cli/codex-cli-exec-first-chat-tokenhub.png) · [task 1](assets/codex-cli/codex-cli-interactive-readme-demo-tokenhub.png) · [task 2](assets/codex-cli/codex-cli-exec-readme-demo-tokenhub.png) |
| Continue | VS Code extension | `2.0.0` | Live verified | Live verified | [guide](continue.md) | [first](assets/continue/continue-first-chat-tokenhub.png) · [task](assets/continue/continue-readme-demo-tokenhub.png) |
| Dify Cloud | Cloud workflow platform | `OpenAI-API-compatible provider 0.0.55` | Live verified | Live verified | [guide](dify.md) | [first](assets/dify/dify-first-chat-tokenhub.png) · [task](assets/dify/dify-readme-excerpt-demo-tokenhub.png) |
| Roo Code | VS Code extension | `3.54.0` | Live verified | Live verified | [guide](roo-code.md) | [first](assets/roo-code/roo-code-first-chat-tokenhub.png) · [task](assets/roo-code/roo-code-readme-demo-tokenhub.png) |
| Kilo Code | VS Code extension | `7.4.1` | Live verified | Live verified | [guide](kilo-code.md) | [first](assets/kilo-code/kilo-code-first-chat-tokenhub.png) · [task](assets/kilo-code/kilo-code-readme-demo-tokenhub.png) |
| OpenCode | CLI/TUI coding agent | `1.17.15` | Live verified | Live verified | [guide](opencode.md) | [first](assets/opencode/opencode-first-chat-tokenhub.png) · [task](assets/opencode/opencode-readme-demo-tokenhub.png) |
| CodeBuddy Code CLI | CLI coding agent | `2.117.2` | Live verified | Live verified | [guide](codebuddy-code.md) | [first](assets/codebuddy-code/codebuddy-code-first-chat-tokenhub.png) · [task](assets/codebuddy-code/codebuddy-code-readme-demo-tokenhub.png) |
<!-- END GENERATED INTEGRATION TABLE -->

“Live verified” means the repository retains both an existing manual-execution statement and visible client-result media. Screenshots are not endpoint transcripts: they do not independently establish the host, request body, authentication, or every protocol feature.

Verified scope is Guangzhou / China-mainland TokenHub with model `hy3`. Singapore/global routing, `.cn` backup domains, per-tool local vLLM/SGLang connectivity, and uniform dedicated streaming/tool-calling tests are documented but not executed. Dify used pasted input rather than local repository access. Tool tasks are intentionally not identical; each guide states its exact boundary.

## Part B reviewer path

- Repository and README: [hy3-tokenhub-spec-diff-reviewer](https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer)
- Current GitHub release: [v1.2.0 — Auditable evidence and reviewer workflow](https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer/releases/tag/v1.2.0)
- Product form: report-oriented CLI plus an interactive loopback Web UI and staged-browser launcher, all over the same review engine
- Current primary evidence: [Live / Hy3 staged-browser MP4](https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer/blob/main/docs/assets/browser/codex-hy3-staged-browser-live-demo.mp4) — **41.567 seconds**
- Current-engine Live report: [Markdown](https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer/blob/main/docs/evidence/live-report-2026-07-22.md) and [structured JSON](https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer/blob/main/docs/evidence/live-report-2026-07-22.json)
- Evidence boundary: the current-engine CLI report was captured with tool version `1.1.0` as a separate bounded Live run, not the browser video's downloaded report; v1.2.0 evidence hardening did not re-execute or rewrite it
- Local verification: **241/241 Node tests** and **42/42 deterministic checks** across six self-authored Offline / Fake fixtures
- CI definition: [Ubuntu and Windows × Node 18.x and 24.x](https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer/actions/workflows/ci.yml), with one Ubuntu/Node 24 job running both `npm pack --dry-run` and the extracted packed-CLI package smoke, and no Live calls or browser capture
- Part B evidence: [manifest](https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer/blob/main/docs/evidence/evidence-manifest.json), [media integrity](https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer/blob/main/docs/evidence/media-integrity.json), and [release readiness](https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer/blob/main/docs/RELEASE_READINESS.md)

The exact offline commands are:

```powershell
# In the Hy3 checkout
node docs/integrations/verify_evidence.js
node --test docs/integrations/test/evidence_verifier.test.js

# In the independent Part B checkout
npm ci
npm run evidence:verify
npm test
npm run eval:offline
```

Neither default evidence verifier requires the internet, a TokenHub credential, or a provider request. Remote-link availability is intentionally outside deterministic CI.
