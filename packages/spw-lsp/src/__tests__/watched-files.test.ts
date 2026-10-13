import { describe, expect, it } from 'vitest'
import { WATCHED_FILES_REGISTRATION_ID, isClientReply, watchedFilesRegistration } from '../watched-files'

describe('watched files', () => {
  it('asks a client that takes dynamic registration for .spw changes and every delete', () => {
    expect(watchedFilesRegistration({ workspace: { didChangeWatchedFiles: { dynamicRegistration: true } } })).toEqual({
      registrations: [{
        id: WATCHED_FILES_REGISTRATION_ID,
        method: 'workspace/didChangeWatchedFiles',
        registerOptions: { watchers: [{ globPattern: '**/*.spw' }, { globPattern: '**/*', kind: 4 }] },
      }],
    })
  })

  it('asks nothing of a client that cannot take it', () => {
    expect(watchedFilesRegistration({})).toBeNull()
    expect(watchedFilesRegistration(null)).toBeNull()
    expect(watchedFilesRegistration({ workspace: { didChangeWatchedFiles: { dynamicRegistration: false } } })).toBeNull()
  })

  it('tells a reply from a request or a notification', () => {
    expect(isClientReply({ id: 'spw-server-1', result: null } as never)).toBe(true)
    expect(isClientReply({ id: 3, method: 'textDocument/hover' })).toBe(false)
    expect(isClientReply({ method: 'initialized' })).toBe(false)
  })
})
