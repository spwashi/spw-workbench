import { describe, expect, it } from 'vitest'
import { CONTAINER_READER_NAMES, OPERATOR_READER_NAMES } from '../learn/readers'
import { BONDS, PAIRS, SLOT_NAMES } from './names'

describe('slot names agree with the reader tables', () => {
  it('each pair slot carries the container reader name', () => {
    for (const key of Object.keys(PAIRS) as Array<keyof typeof PAIRS>) {
      const pair = SLOT_NAMES[key].pair!
      expect(CONTAINER_READER_NAMES[pair]).toBe(SLOT_NAMES[key].reader)
    }
  })

  it('each join mark names its operator reader name as its bond', () => {
    for (const [mark, bond] of Object.entries(BONDS)) {
      expect(OPERATOR_READER_NAMES[mark]).toBe(bond)
    }
  })
})
