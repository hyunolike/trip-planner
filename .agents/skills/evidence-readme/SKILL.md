---
name: evidence-readme
description: Write or update a repository README from code and verified commands, with accurate feature status, architecture diagrams, deployment state and optional multilingual versions. Use for project introduction and contributor onboarding documentation.
---

# Evidence-based repository README

Before drafting, inspect repository instructions and the existing README/language links. Collect the smallest relevant evidence set: package/build scripts, entry points, routes/modules, config templates, CI, ADRs, tests, and deployment metadata already available within the user's authorization.

Keep an evidence ledger while working: each important feature, command, version, architectural edge and deployment claim needs a file or verified external source. Treat test coverage, local smoke success, prepared manifests and a running public deployment as different facts. Do not invent teammates, usage metrics, screenshots, demo URLs or completed integrations.

Use the reader's questions to choose sections: what problem this solves and for whom, what works today, how to run/test it, why these technologies fit, how components communicate, and what remains. Preserve useful existing sections and language navigation. Do not force a monorepo, provider, framework, heading order or infrastructure pattern onto other projects.

For optional Woowa course team examples, read [references/team-readmes.md](references/team-readmes.md). Borrow organizational ideas, not their prose, logos, screenshots, metrics or presumed topology.

Document portable commands from actual scripts; distinguish prerequisites and environment variable names from secret values. Validate non-destructive commands appropriate to the task, and label commands that seed/reset data or require unapproved accounts. Never run a deploy, create credentials or send mail merely to improve documentation.

For diagrams, trace each arrow against code/config. Separate the current system, prepared configuration, proposed resources and actual deployment state. Include trust/proxy boundaries and state ownership when material. Prefer repository SVG/PNG or Mermaid based on the requested deliverable. Render and visually inspect generated image files for clipped text, overlap, arrow directions, legend consistency and legibility; retain editable source. Verify relative paths, descriptive alt text and GitHub-compatible output.

When multilingual READMEs exist, preserve their entry points and update equivalent facts in both. A new translation should name the same states and avoid implying an integration is live in one language but proposed in another.

Finish with a link/image check and factual review against the evidence ledger. Report files, validation performed, remaining unverified claims and how to invoke this skill. Keep authorization for code changes, external writes and publication separate from README work.
