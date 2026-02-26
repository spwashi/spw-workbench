# Writerside Integration

This topic explains how Writerside content is integrated into repository validation.

## Files and responsibilities

- `Writerside/writerside.cfg`: entry configuration for topics, images, and instance sources.
- `Writerside/spw-workbench.tree`: internal instance profile and TOC graph.
- `Writerside/spw-workbench-public.tree`: public instance profile and TOC graph.
- `Writerside/cfg/buildprofiles.xml`: build-profile settings per instance id.
- `Writerside/c.list`: category registry used by related-links sections.
- `Writerside/v.list`: shared variables including `%product%`.

## Validation commands (canon repo)

```bash
npm run lint:writerside
npm run lint:docs
npm run lint:docs:strict
```

`lint:writerside` checks:
- instance file references from `writerside.cfg`
- `start-page` and `toc-element` topic existence
- build-profile instance alignment
- local links between Writerside topics

`lint:docs` (canon-safe) checks:
- Writerside integrity only

`lint:docs:strict` checks:
- `.spw` reference integrity (root refs + local refs)
- Writerside integrity

Note: `lint:docs:strict` assumes the repo contains the referenced workbench surfaces (for example, `src/` beyond the kernel). In early canon, it is expected to fail until those modules are imported.

## Build instances

<tabs>
    <tab title="Internal">
        <list>
            <li>Instance: <code>spw-workbench</code></li>
            <li>Intended for contributors and maintainers</li>
            <li>Includes workflow and validation playbook topics</li>
        </list>
    </tab>
    <tab title="Public">
        <list>
            <li>Instance: <code>spw-workbench-public</code></li>
            <li>Intended for artist-first orientation and architecture context</li>
            <li>Focused on exhibits, claims, instruments, and prompt packs</li>
        </list>
    </tab>
</tabs>

### Troubleshooting {collapsible="true"}

- Unknown build-profile instance: add or rename the matching `<instance-profile id="...">` in `spw-workbench.tree`.
- Missing TOC topic: create the file under `Writerside/topics/` or update the `topic="..."` reference.
- Broken local link: keep links relative to the current topic file location.

<seealso>
    <category ref="spw-workbench">
        <a href="orientation-for-artists.md"/>
        <a href="exhibits.md"/>
        <a href="prompt-packs.md"/>
        <a href="claims.md"/>
        <a href="instruments.md"/>
        <a href="documentation-map.md"/>
    </category>
</seealso>
