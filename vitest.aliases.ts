import path from 'node:path'

export const vitestWorkspaceAlias = {
  '@spw/seed': path.resolve(__dirname, 'packages/spw-seed/src/index.ts'),
  '@spw/seed/parser': path.resolve(__dirname, 'packages/spw-seed/src/parser.ts'),
  '@spw/runtime': path.resolve(__dirname, 'packages/spw-runtime/src/index.ts'),
  '@spw/runtime/pipeline': path.resolve(__dirname, 'packages/spw-runtime/src/pipeline.ts'),
  '@spw/runtime/substrate': path.resolve(__dirname, 'packages/spw-runtime/src/substrate.ts'),
  '@spw/runtime/resonance': path.resolve(__dirname, 'packages/spw-runtime/src/resonance.ts'),
  '@spw/cli': path.resolve(__dirname, 'packages/spw-cli/src/index.ts'),
  '@spw/lsp': path.resolve(__dirname, 'packages/spw-lsp/src/index.ts'),
} as const
