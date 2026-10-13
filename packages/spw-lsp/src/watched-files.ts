/**
 * Watched files — which file events the server asks its client to send.
 *
 * Clients differ: VS Code registered watchers of its own, while Neovim sends
 * file events only for watchers a server registers. The server now registers
 * one set for every client that supports dynamic registration: every .spw
 * file, and deletes of anything, since a deleted folder raises one event for
 * the folder and none for the .spw files it held.
 */

export const WATCHED_FILES_REGISTRATION_ID = 'spw-watched-files'

/** LSP WatchKind bits: Create = 1, Change = 2, Delete = 4. */
const WATCH_KIND_DELETE = 4

export interface WatchedFilesRegistration {
  registrations: Array<{
    id: string
    method: 'workspace/didChangeWatchedFiles'
    registerOptions: { watchers: Array<{ globPattern: string; kind?: number }> }
  }>
}

/** The registration to send after `initialized`, or null when the client cannot take one. */
export function watchedFilesRegistration(clientCapabilities: unknown): WatchedFilesRegistration | null {
  const workspace = (clientCapabilities as { workspace?: { didChangeWatchedFiles?: { dynamicRegistration?: unknown } } } | null)?.workspace
  if (workspace?.didChangeWatchedFiles?.dynamicRegistration !== true) return null
  return {
    registrations: [{
      id: WATCHED_FILES_REGISTRATION_ID,
      method: 'workspace/didChangeWatchedFiles',
      registerOptions: {
        watchers: [
          { globPattern: '**/*.spw' },
          { globPattern: '**/*', kind: WATCH_KIND_DELETE },
        ],
      },
    }],
  }
}

/** A message with an id and no method is the client's reply to a request the server sent. */
export function isClientReply(message: { id?: unknown; method?: unknown }): boolean {
  return message.id !== undefined && typeof message.method !== 'string'
}
