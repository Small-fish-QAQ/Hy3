# Hy3 integrations

Nine task-complete guides show how to use Hy3 from mainstream AI clients. Start with the tool you already use; shared TokenHub region, authentication, and safety details live in one place.

- [TokenHub cloud setup](tokenhub.md): region-matched endpoint, model access, authentication, model-list preflight, smoke test, and safety.
- [Local server setup](local-server.md): repository-documented vLLM/SGLang serving, protocol limits, and hardware feasibility.

Every version below is an exact **tested snapshot**, not a claimed minimum supported version or a statement about the current latest release. All client runs used model `hy3` and the Guangzhou / China-mainland TokenHub service. Singapore / global routing is documented but was not tested.

## Part A: integration verification matrix

| Tool | Tested snapshot | Test date | Protocol | Evidence | Result | Known limitation |
|:---|:---|:---|:---|:---|:---|:---|
| [Aider](aider.md) | `0.86.2` | 2026-07-09 | Chat Completions | [2 screenshots](aider.md#screenshots--gifs) | Client task completed | Repository map generated; local/tool-call/streaming paths unverified |
| [Cline](cline.md) | `4.0.6` | 2026-07-08 | Chat Completions | [2 screenshots](cline.md#screenshots--gif) | Client task completed | General-protocol tool calling unverified |
| [Codex CLI](codex-cli.md) | `0.142.5`; `0.144.1` compatibility check | 2026-07-09 | Responses | [4 screenshots](codex-cli.md#screenshots--gifs) | Exec and interactive tasks completed | Model-list and stream-delta warnings were visible |
| [Continue](continue.md) | `2.0.0` | 2026-07-08; secret check 2026-07-10 | Chat Completions | [2 screenshots](continue.md#screenshots--gifs) | Client task completed | Full VS Code restart required after secret changes |
| [Dify Cloud](dify.md) | provider `0.0.55` | 2026-07-10 | Chat Completions | [2 screenshots](dify.md#screenshots--gifs) | Workflow task completed | Pasted input only; no local repository access |
| [Roo Code](roo-code.md) | `3.54.0` | 2026-07-10 | Chat Completions | [2 screenshots](roo-code.md#screenshots--gif) | Client task completed | General tool calling and streaming unverified |
| [Kilo Code](kilo-code.md) | `7.4.1` | 2026-07-08 | Chat Completions | [2 screenshots](kilo-code.md#screenshots--gif) | Client task completed | Custom provider only; not Kilo Gateway |
| [OpenCode](opencode.md) | `1.17.15` | 2026-07-08 | OpenAI-compatible adapter | [2 screenshots](opencode.md#screenshots--gif) | CLI task completed | Local test configuration intentionally excluded |
| [CodeBuddy Code](codebuddy-code.md) | `2.117.2` | 2026-07-08 | Chat Completions | [2 screenshots](codebuddy-code.md#screenshots--gif) | Print-mode task completed | Tool-call flag not tested |

Screenshots prove the visible client result described by each guide; they are not endpoint-level request transcripts. Local self-hosting and any feature marked unverified were not silently inferred from those images. Existing media is retained as historical evidence even where a username, branch name, or working-tree noise remains visible.

## What each guide contains

Each guide preserves the issue-required workflow: installation and tested snapshot, exact base URL and model, authentication, protocol/provider selection, first chat, a real task, screenshots, and troubleshooting. Tool-specific differences stay in the guide; shared TokenHub facts stay in [tokenhub.md](tokenhub.md).

## Part B: Codex + Hy3 evidence-grounded spec diff reviewer

The standalone reviewer supports both report-oriented CLI use and a loopback-only staged-browser workflow. The recommended workflow is launched from the Git repository being reviewed: after a one-time `npm ci` and `npm link` in the reviewer checkout, `hy3-review-staged --spec examples/spec.md` treats the current Git repository as the repository being reviewed, reads the explicitly selected specification and the repository's staged Git diff, starts the local browser console, automatically preloads the Specification and Unified Diff inputs, and selects Live / Hy3 for the real workflow. Offline / Fake remains an explicit deterministic reproduction path.

Codex or another developer tool may modify code, but the human still chooses and stages the intended diff. Hy3 performs the semantic review; local code validates the structured result and every cited specification and diff location; Markdown and JSON reports include input hashes and execution provenance. The reviewer does not edit code, stage files, commit, reset, or otherwise mutate Git state.

- Repository: [hy3-tokenhub-spec-diff-reviewer](https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer)
- Current 41-second Live / Hy3 staged-browser demo: [codex-hy3-staged-browser-live-demo.mp4](https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer/blob/main/docs/assets/browser/codex-hy3-staged-browser-live-demo.mp4)
- Current 1440×900 browser preview: [review-console-1440x900.png](https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer/blob/main/docs/assets/browser/review-console-1440x900.png)
- One-time local setup in the reviewer checkout: `npm ci`, then `npm link`
- Recommended staged-browser command, run from the repository being reviewed: `hy3-review-staged --spec examples/spec.md`
- Direct CLI report command: `npm run review:staged -- --spec examples/spec.md --output reports/review.md`
- Deterministic browser reproduction: `npm run serve`, then Load sample → Offline / Fake → Start review
- Live preflight: `npm run check`
- Codex workflow guide: [docs/CODEX_WORKFLOW.md](https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer/blob/main/docs/CODEX_WORKFLOW.md)
- Sanitized 2026-07-22 live verification record: [docs/evidence/live-verification-2026-07-22.md](https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer/blob/main/docs/evidence/live-verification-2026-07-22.md)
- Historical 31-second CLI-core recording, earlier-revision evidence only: [hy3-spec-to-diff-demo.mp4](https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer/blob/fecbbc49a4e3c21f2fe78b9ab3bcc9ee24ec156f/docs/assets/hy3-spec-to-diff-demo.mp4)

The current video, approximately 42 seconds long, demonstrates the workflow on a staged Git change: automatically populated browser inputs, a Live / Hy3 semantic review returning a NOT READY verdict, requirement-level coverage, verified specification and diff citations, multiple implementation and test findings including missing boundary and invalid-input tests, Live / Hy3 execution provenance with local schema validation and local evidence validation passed, and Markdown and JSON export controls. Live model output can vary between runs, so coverage counts, finding counts, and severity mix are not fixed claims.

The historical 31-second MP4 remains real TokenHub evidence, but it shows an earlier CLI revision recorded before the staged-browser workflow, the fixed structured schema, local evidence verification, and the current browser report and export workflow. It must not be presented as the current product demo.

Limitations: local citation validation proves that quoted locations exist, not that every model conclusion is semantically correct. Prompt-injection risk is reduced, not eliminated. The specification and staged diff are supplied as review inputs and must not contain secrets. Live behavior depends on TokenHub availability, model access, credentials, and the selected regional endpoint.
