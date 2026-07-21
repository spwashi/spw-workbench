import path from 'node:path'

export const vitestWorkspaceAlias = {
  '@spwashi/spw-seed': path.resolve(__dirname, 'packages/spw-seed/src/index.ts'),
  '@spwashi/spw-seed/parser': path.resolve(__dirname, 'packages/spw-seed/src/parser.ts'),
  '@spwashi/spw-runtime': path.resolve(__dirname, 'packages/spw-runtime/src/index.ts'),
  '@spwashi/spw-runtime/pipeline': path.resolve(__dirname, 'packages/spw-runtime/src/pipeline.ts'),
  '@spwashi/spw-runtime/substrate': path.resolve(__dirname, 'packages/spw-runtime/src/substrate.ts'),
  '@spwashi/spw-runtime/resonance': path.resolve(__dirname, 'packages/spw-runtime/src/resonance.ts'),
  '@spwashi/spw-cli': path.resolve(__dirname, 'packages/spw-cli/src/index.ts'),
  '@spwashi/spw-lsp/workspace-protocol': path.resolve(__dirname, 'packages/spw-lsp/src/workspace-protocol.ts'),
  '@spwashi/spw-lsp': path.resolve(__dirname, 'packages/spw-lsp/src/index.ts'),
} as const
