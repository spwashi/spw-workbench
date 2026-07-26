# Spw CLI Persistent Cache Design

> Status: proposed; no persistent cache or `spw cache` command is implemented.

## Intent

A future persistent cache may reduce repeated parsing work for read-only corpus
commands such as `spw invent`, `spw map`, `spw formula`, and `spw query`.
Measurements must establish the worthwhile workloads and performance target
before implementation.

The design separates two kinds of facts:

1. **Content-local analysis** depends only on one file's bytes and the versioned
   parser/analyzer configuration.
2. **Corpus-derived analysis** depends on the complete set of files in a scan
   and belongs to an immutable corpus generation.

This distinction prevents a cached file record from retaining a graph role
after another file adds or removes an edge.

## 1. Storage Model

The proposed cache lives below `.spw/.cache/`, which must be ignored by source
control:

```text
.spw/.cache/
  content/<content-sha256>/<analysis-key>.json
  generations/<generation-id>/manifest.json
  generations/<generation-id>/graph.json
  current.json
```

### Content-local entries

A content entry is immutable and reusable across paths when all of these inputs
match:

- SHA-256 of the exact source bytes;
- parser and analyzer identifiers and versions;
- lexing or dialect profile;
- relevant analysis options.

It may contain an AST snapshot, parse diagnostics, source-local references, and
signal counts. It must not contain degree, centrality, cycle membership,
`topographyRole`, or any other fact that can change when the surrounding corpus
changes.

An illustrative entry:

```json
{
  "schemaVersion": 1,
  "contentSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "analysis": {
    "parser": "@spwashi/spw-seed@0.3.0",
    "analyzer": "spw-cli-local-signals@1",
    "profile": "canonical"
  },
  "signalCounts": {
    "lines": 120,
    "sigils": 45,
    "frames": 6,
    "pathRefs": 8,
    "rootRefs": 2
  }
}
```

### Corpus generations

A generation manifest records the scan boundary and the exact content used:

```json
{
  "schemaVersion": 1,
  "generationId": "<sha256-of-generation-inputs>",
  "roots": ["."],
  "files": {
    "prompts/main.spw": {
      "contentSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "analysisKey": "<versioned-analysis-key>"
    }
  },
  "graphAnalysis": {
    "analyzer": "spw-cli-topography@1",
    "optionsHash": "<sha256>"
  }
}
```

`graph.json` may contain path resolution, graph edges, strongly connected
components, and topography roles. Those products are valid only for the
generation named by their manifest. A command must not combine graph products
from one generation with content entries selected by another.

`current.json` is only a pointer to a completed generation. A builder writes a
new generation completely and then replaces that pointer, so readers see the
old complete generation or the new complete generation.

## 2. Freshness and Invalidation

Filesystem metadata such as `mtimeMs` and size may be retained as a performance
hint, but metadata equality is not proof of content equality. Cache reuse is
authorized by a matching content hash and analysis key.

A safe hydration pass is:

1. Resolve the scan roots and enumerate the current relative paths.
2. Read each source and calculate its content hash. Metadata may prioritize
   obviously changed files, but it does not bypass verification.
3. Reuse a content-local entry when both content hash and analysis key match;
   otherwise parse and analyze the file.
4. Derive a generation ID from the ordered `(relative path, content hash)` set,
   root configuration, graph analyzer version, and graph options.
5. Reuse a completed generation with that ID or compute its graph products.

This contract avoids claiming that a metadata shortcut can guarantee
zero-stale reads. A later optimization that skips content hashing would need an
explicitly weaker freshness policy, instrumentation, and measured justification.

Changing any parser, analyzer, profile, root boundary, or analysis option
changes its corresponding key. Deleted and renamed files change the generation
ID even when their content entries remain reusable.

## 3. Proposed CLI Surface

Normal corpus commands should use a valid cache opportunistically and fall back
to direct analysis if it is absent, incompatible, or corrupt.

The maintenance namespace is proposed as:

```text
spw cache status
spw cache rebuild
spw cache verify
```

`spw cache rebuild` would construct and publish a fresh generation. It must not
be named `spw refresh`: that command already refreshes plan cache blocks and has
a separate contract.

Until the command and storage schemas exist, help text and emitted envelopes
must not advertise this surface as available.

## 4. Operational Invariants

- **Generation consistency:** a result uses content and graph facts from one
  declared generation.
- **Content-addressed reuse:** content-local analysis is reused only for the
  same bytes and versioned analysis inputs.
- **Fail-safe fallback:** missing, incompatible, partial, or corrupt cache data
  causes direct analysis rather than a failed corpus command.
- **Portable keys:** manifests store normalized workspace-relative paths, never
  absolute user paths.
- **Recoverable publication:** incomplete generations are never selected by
  `current.json`; failed builds leave the previous complete generation usable.
- **Concurrent safety:** writers stage distinct generation directories and
  coordinate pointer replacement; readers never mutate generations.
- **Schema honesty:** schema URLs are added only when the referenced schemas
  exist and validation is part of the implementation.

## 5. Implementation Gates

Before implementation:

1. Benchmark representative cold and warm corpora and record the parse, hashing,
   graph, and serialization costs independently.
2. Define and test the content-entry, generation-manifest, and graph schemas.
3. Test changed content with preserved mtime/size, deletes, renames, profile and
   analyzer upgrades, corrupt entries, interrupted writes, and concurrent
   readers.
4. Demonstrate equivalent command output with the cache disabled, rebuilt, and
   reused.
