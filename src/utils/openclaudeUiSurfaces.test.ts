import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { homedir } from 'os'
import { join } from 'path'
import {
  acquireSharedMutationLock,
  releaseSharedMutationLock,
} from '../test/sharedMutationLock.js'

import { isInGlobalClaudeFolder } from '../components/permissions/FilePermissionDialog/permissionOptions.tsx'
import { getDisplayPath } from './file.ts'
import { getDefaultPermissionModeOptions } from './permissions/defaultPermissionModeOptions.ts'
import {
  checkPathSafetyForAutoEdit,
  getClaudeSkillScope,
  isClaudeSettingsPath,
} from './permissions/filesystem.ts'
import { getValidationTip } from './settings/validationTips.ts'

const originalConfigDir = process.env.CLAUDE_CONFIG_DIR
const originalBitLiquidConfigDir = process.env.BITLIQUID_CONFIG_DIR

beforeEach(async () => {
  await acquireSharedMutationLock('bitliquidUiSurfaces.test.ts')
  mock.restore()
  delete process.env.CLAUDE_CONFIG_DIR
  delete process.env.BITLIQUID_CONFIG_DIR
})

afterEach(() => {
  try {
    if (originalConfigDir === undefined) {
      delete process.env.CLAUDE_CONFIG_DIR
    } else {
      process.env.CLAUDE_CONFIG_DIR = originalConfigDir
    }
    if (originalBitLiquidConfigDir === undefined) {
      delete process.env.BITLIQUID_CONFIG_DIR
    } else {
      process.env.BITLIQUID_CONFIG_DIR = originalBitLiquidConfigDir
    }
  } finally {
    releaseSharedMutationLock()
  }
})

describe('BitLiquid settings path surfaces', () => {
  test('isClaudeSettingsPath recognizes project .bitliquid settings files', () => {
    expect(
      isClaudeSettingsPath(
        join(process.cwd(), '.bitliquid', 'settings.json'),
      ),
    ).toBe(true)

    expect(
      isClaudeSettingsPath(
        join(process.cwd(), '.bitliquid', 'settings.local.json'),
      ),
    ).toBe(true)
  })

  test('legacy .claude paths remain protected from auto-editing', () => {
    expect(
      isClaudeSettingsPath(join(process.cwd(), '.claude', 'settings.json')),
    ).toBe(true)
    expect(
      isClaudeSettingsPath(
        join(process.cwd(), '.claude', 'settings.local.json'),
      ),
    ).toBe(true)

    expect(
      checkPathSafetyForAutoEdit(
        join(process.cwd(), '.claude', 'settings.json'),
      ),
    ).toMatchObject({ safe: false })
    expect(
      checkPathSafetyForAutoEdit(
        join(process.cwd(), '.claude', 'commands', 'foo.md'),
      ),
    ).toMatchObject({ safe: false })
  })

  test('permission save destinations point user settings to configured BITLIQUID_CONFIG_DIR', async () => {
    const customConfigDir = join(homedir(), 'custom-bitliquid')
    process.env.BITLIQUID_CONFIG_DIR = customConfigDir
    delete process.env.CLAUDE_CONFIG_DIR
    const { optionForPermissionSaveDestination } = await import(
      '../components/permissions/rules/AddPermissionRules.tsx'
    )

    expect(optionForPermissionSaveDestination('userSettings')).toEqual({
      label: 'User settings',
      description: `Saved in ${getDisplayPath(join(customConfigDir, 'settings.json'))}`,
      value: 'userSettings',
    })
  })

  test('skills help surfaces point user skills to configured BITLIQUID_CONFIG_DIR', async () => {
    const customConfigDir = join(homedir(), 'custom-bitliquid')
    process.env.BITLIQUID_CONFIG_DIR = customConfigDir
    delete process.env.CLAUDE_CONFIG_DIR
    const { getEmptySkillsMenuMessage } = await import(
      '../components/skills/SkillsMenu.tsx'
    )
    const { getCustomCommandsTipContent } = await import(
      '../services/tips/tipRegistry.ts'
    )
    const customSkillPath = getDisplayPath(
      join(customConfigDir, 'skills', '<name>', 'SKILL.md'),
    )

    expect(getEmptySkillsMenuMessage()).toContain(customSkillPath)
    expect(getCustomCommandsTipContent()).toContain(customSkillPath)
  })

  test('permission save destinations point project settings to .bitliquid', async () => {
    const { optionForPermissionSaveDestination } = await import(
      '../components/permissions/rules/AddPermissionRules.tsx'
    )

    expect(optionForPermissionSaveDestination('projectSettings')).toEqual({
      label: 'Project settings',
      description: 'Checked in at .bitliquid/settings.json',
      value: 'projectSettings',
    })

    expect(optionForPermissionSaveDestination('localSettings')).toEqual({
      label: 'Project settings (local)',
      description: 'Saved in .bitliquid/settings.local.json',
      value: 'localSettings',
    })
  })

  test('permission dialog treats ~/.bitliquid as the global Claude folder', () => {
    process.env.BITLIQUID_CONFIG_DIR = join(homedir(), '.bitliquid')
    delete process.env.CLAUDE_CONFIG_DIR

    expect(
      isInGlobalClaudeFolder(
        join(homedir(), '.bitliquid', 'settings.json'),
      ),
    ).toBe(true)
    expect(
      isInGlobalClaudeFolder(join(homedir(), '.claude', 'settings.json')),
    ).toBe(false)
  })

  test('permission dialog does not treat arbitrary CLAUDE_CONFIG_DIR as the global Claude folder', () => {
    process.env.CLAUDE_CONFIG_DIR = join(homedir(), 'custom-bitliquid')

    expect(
      isInGlobalClaudeFolder(
        join(homedir(), 'custom-bitliquid', 'settings.json'),
      ),
    ).toBe(false)
  })

  test('global skill scope recognizes ~/.bitliquid skills only', () => {
    process.env.BITLIQUID_CONFIG_DIR = join(homedir(), '.bitliquid')
    delete process.env.CLAUDE_CONFIG_DIR

    expect(
      getClaudeSkillScope(
        join(homedir(), '.bitliquid', 'skills', 'demo', 'SKILL.md'),
      ),
    ).toEqual({
      skillName: 'demo',
      pattern: '~/.bitliquid/skills/demo/**',
    })

    expect(
      getClaudeSkillScope(
        join(homedir(), '.claude', 'skills', 'legacy', 'SKILL.md'),
      ),
    ).toBeNull()
  })

  test('global skill scope does not emit fixed rules for arbitrary CLAUDE_CONFIG_DIR skills', () => {
    process.env.CLAUDE_CONFIG_DIR = join(homedir(), 'custom-bitliquid')

    expect(
      getClaudeSkillScope(
        join(homedir(), 'custom-bitliquid', 'skills', 'demo', 'SKILL.md'),
      ),
    ).toBe(null)
  })
})

describe('BitLiquid validation tips', () => {
  test('permissions.defaultMode invalid value keeps suggestion but no Claude docs link', () => {
    const tip = getValidationTip({
      path: 'permissions.defaultMode',
      code: 'invalid_value',
      enumValues: [
        'acceptEdits',
        'bypassPermissions',
        'default',
        'dontAsk',
        'fullAccess',
        'plan',
      ],
    })

    expect(tip).toEqual({
      suggestion:
        'Valid modes: "acceptEdits" (ask before file changes), "plan" (analysis only), "bypassPermissions" (auto-accept prompts), "fullAccess" (skip even hard safety-check prompts), or "default" (standard behavior)',
    })
  })
})

describe('BitLiquid permission mode surfaces', () => {
  test('default permission mode picker excludes dangerous persisted modes', () => {
    const options = getDefaultPermissionModeOptions(true)

    expect(options).not.toContain('bypassPermissions')
    expect(options).not.toContain('fullAccess')
  })
})
