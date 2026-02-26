# %product% Documentation

%product% is a research-oriented browser workbench for exploring Spw parsing, semantics, runtime behavior, and UI architecture.

This Writerside instance is focused on contributor onboarding and maintenance workflows for this repository.

## Navigation

- [](quick-start-checklist.topic)
- [](developer-workflow.md)
- [](experiments-and-skills.md)
- [](validation-playbook.topic)
- [](writerside-integration.md)
- [](workbench-architecture.md)
- [](philosophy-and-references.md)
- [](documentation-map.md)

## Reader Paths

<tabs>
    <tab title="New Contributor">
        <list>
            <li><a href="quick-start-checklist.topic"/></li>
            <li><a href="workbench-architecture.md"/></li>
            <li><a href="developer-workflow.md"/></li>
            <li><a href="experiments-and-skills.md"/></li>
            <li><a href="philosophy-and-references.md"/></li>
        </list>
    </tab>
    <tab title="Maintainer">
        <list>
            <li><a href="maintenance-surface.topic"/></li>
            <li><a href="validation-playbook.topic"/></li>
            <li><a href="writerside-integration.md"/></li>
            <li><a href="experiments-and-skills.md"/></li>
            <li><a href="documentation-map.md"/></li>
            <li>Repository references: <code>AGENTS.md</code>, <code>docs/index.spw</code>, <code>src/index.spw</code></li>
        </list>
    </tab>
</tabs>

## Core command set

```bash
nvm use
npm run dev
npm run test:run
npm run lint:writerside
npm run lint:docs
npm run lint:spw
```

## What this project emphasizes

- Layered architecture across `core`, `infra`, `lang`, `runtime`, `viz`, `ui`, `design`, `features`, `app`, and `platform`
- Spw-first language/runtime behavior
- Accessibility and debuggable UI semantics
- Instrumented, auditable docs and syntax workflows

### Troubleshooting cues {collapsible="true"}

- If `lint:docs` fails, check moved file references and root aliases first.
- If `lint:spw` fails, inspect parser diagnostics before editing unrelated files.
- If commit hooks flag layer issues, verify imports against `src/core/domains/index.ts`.

<seealso>
    <category ref="spw-workbench">
        <a href="quick-start-checklist.topic"/>
        <a href="developer-workflow.md"/>
        <a href="writerside-integration.md"/>
        <a href="workbench-architecture.md"/>
        <a href="documentation-map.md"/>
    </category>
</seealso>
