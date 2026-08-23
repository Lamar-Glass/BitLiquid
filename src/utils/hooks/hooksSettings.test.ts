import { describe, expect, test } from 'bun:test'
import { hookSourceDescriptionDisplayString } from './hooksSettings.js'

describe('hookSourceDescriptionDisplayString', () => {
  test('uses the canonical BitLiquid plugin path for plugin hooks', () => {
    const description = hookSourceDescriptionDisplayString('pluginHook')

    expect(description).toBe(
      'Plugin hooks (~/.bitliquid/plugins/*/hooks/hooks.json)',
    )
    expect(description).not.toContain('~/.claude/')
  })
})
