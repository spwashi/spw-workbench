#!/usr/bin/env tsx
/**
 * Writerside reference checker
 *
 * Validates Writerside instance/build-profile coherence and local topic links.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'

interface Issue {
  file: string
  message: string
}

interface InstanceProfile {
  id: string
  file: string
  startPage: string
  topics: string[]
}

const TOPIC_EXTENSIONS = new Set(['.md', '.topic'])

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function parseAttributes(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const attrRegex = /([A-Za-z_:][A-Za-z0-9_.:-]*)\s*=\s*"([^"]*)"/g
  let match: RegExpExecArray | null
  while ((match = attrRegex.exec(raw))) {
    const [, key, value] = match
    attrs[key] = value
  }
  return attrs
}

function parseSelfClosingTags(xml: string, tagName: string): Array<Record<string, string>> {
  const tags: Array<Record<string, string>> = []
  const tagRegex = new RegExp(`<${tagName}\\b([^>]*)\\/?>`, 'g')
  let match: RegExpExecArray | null
  while ((match = tagRegex.exec(xml))) {
    tags.push(parseAttributes(match[1] ?? ''))
  }
  return tags
}

function parseInstanceProfiles(instanceXml: string, instancePath: string): InstanceProfile[] {
  const profiles: InstanceProfile[] = []
  const profileRegex = /<instance-profile\b([^>]*)>([\s\S]*?)<\/instance-profile>/g
  let match: RegExpExecArray | null

  while ((match = profileRegex.exec(instanceXml))) {
    const attrs = parseAttributes(match[1] ?? '')
    const body = match[2] ?? ''
    const id = attrs.id ?? ''
    const startPage = attrs['start-page'] ?? ''
    const topics = parseSelfClosingTags(body, 'toc-element')
      .map((tag) => tag.topic)
      .filter((value): value is string => !!value)

    profiles.push({
      id,
      file: instancePath,
      startPage,
      topics,
    })
  }

  return profiles
}

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join('/')
}

async function collectTopicFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectTopicFiles(full))
      continue
    }
    if (!entry.isFile()) continue
    if (TOPIC_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full)
    }
  }

  return files
}

function extractLinkTargets(content: string): string[] {
  const targets: string[] = []

  const markdownLinkRegex = /\[[^\]]*\]\(([^)]+)\)/g
  let markdownMatch: RegExpExecArray | null
  while ((markdownMatch = markdownLinkRegex.exec(content))) {
    const target = markdownMatch[1]?.trim()
    if (target) targets.push(target)
  }

  const xmlHrefRegex = /\bhref="([^"]+)"/g
  let xmlMatch: RegExpExecArray | null
  while ((xmlMatch = xmlHrefRegex.exec(content))) {
    const target = xmlMatch[1]?.trim()
    if (target) targets.push(target)
  }

  return targets
}

function normalizeTarget(rawTarget: string): string | null {
  const target = rawTarget.trim()
  if (!target) return null
  if (target.startsWith('#')) return null
  if (target.startsWith('http://') || target.startsWith('https://')) return null
  if (target.startsWith('mailto:')) return null
  if (target.startsWith('javascript:')) return null

  const withoutAnchor = target.split('#')[0]
  const withoutQuery = withoutAnchor.split('?')[0]
  if (!withoutQuery) return null

  const ext = path.extname(withoutQuery)
  if (!TOPIC_EXTENSIONS.has(ext)) return null

  return withoutQuery
}

async function main(): Promise<void> {
  const repoRoot = process.cwd()
  const writersideRoot = path.join(repoRoot, 'Writerside')
  const issues: Issue[] = []

  if (!(await fileExists(writersideRoot))) {
    console.log('✓ Writerside directory not found; skipping')
    return
  }

  const cfgPath = path.join(writersideRoot, 'writerside.cfg')
  if (!(await fileExists(cfgPath))) {
    console.error('✗ Missing Writerside/writerside.cfg')
    process.exit(1)
  }

  const cfgContent = await fs.readFile(cfgPath, 'utf8')
  const topicsTag = parseSelfClosingTags(cfgContent, 'topics')[0]
  const topicsDir = topicsTag?.dir ?? 'topics'
  const topicsRoot = path.resolve(writersideRoot, topicsDir)

  const instanceTags = parseSelfClosingTags(cfgContent, 'instance')
  if (instanceTags.length === 0) {
    issues.push({ file: cfgPath, message: 'No <instance src="..."> entries found' })
  }

  const instanceProfiles: InstanceProfile[] = []
  for (const tag of instanceTags) {
    const src = tag.src
    if (!src) {
      issues.push({ file: cfgPath, message: 'Found <instance> tag without src attribute' })
      continue
    }

    const instancePath = path.resolve(writersideRoot, src)
    if (!(await fileExists(instancePath))) {
      issues.push({ file: cfgPath, message: `Missing instance file: ${src}` })
      continue
    }

    const instanceContent = await fs.readFile(instancePath, 'utf8')
    const profiles = parseInstanceProfiles(instanceContent, instancePath)
    if (profiles.length === 0) {
      issues.push({ file: instancePath, message: 'No <instance-profile> blocks found' })
    } else if (profiles.length > 1) {
      issues.push({
        file: instancePath,
        message: `Expected exactly one <instance-profile>, found ${profiles.length}`,
      })
    }

    const declaredId = tag.id ?? ''
    if (!declaredId) {
      issues.push({
        file: cfgPath,
        message: `Instance "${src}" missing id attribute`,
      })
    } else {
      const hasMatchingProfile = profiles.some((profile) => profile.id === declaredId)
      if (!hasMatchingProfile) {
        issues.push({
          file: instancePath,
          message: `Instance id mismatch: cfg id "${declaredId}" not found in instance-profile`,
        })
      }
    }

    instanceProfiles.push(...profiles)
  }

  const knownInstanceIds = new Set(instanceProfiles.map((profile) => profile.id).filter(Boolean))

  for (const profile of instanceProfiles) {
    if (!profile.id) {
      issues.push({ file: profile.file, message: 'Found instance-profile without id' })
    }
    if (!profile.startPage) {
      issues.push({
        file: profile.file,
        message: `Instance "${profile.id || '<missing-id>'}" has no start-page`,
      })
    } else {
      const startPath = path.resolve(topicsRoot, profile.startPage)
      if (!(await fileExists(startPath))) {
        issues.push({
          file: profile.file,
          message: `Instance "${profile.id}" start-page missing: ${profile.startPage}`,
        })
      }
    }

    if (profile.topics.length === 0) {
      issues.push({
        file: profile.file,
        message: `Instance "${profile.id || '<missing-id>'}" has no toc-element entries`,
      })
    }

    for (const topic of profile.topics) {
      const topicPath = path.resolve(topicsRoot, topic)
      if (!(await fileExists(topicPath))) {
        issues.push({
          file: profile.file,
          message: `Instance "${profile.id}" references missing topic: ${topic}`,
        })
      }
    }
  }

  const buildProfilesPath = path.join(writersideRoot, 'cfg', 'buildprofiles.xml')
  if (await fileExists(buildProfilesPath)) {
    const buildProfilesContent = await fs.readFile(buildProfilesPath, 'utf8')
    const buildProfiles = parseSelfClosingTags(buildProfilesContent, 'build-profile')
    for (const buildProfile of buildProfiles) {
      const instanceName = buildProfile.instance
      if (!instanceName) {
        issues.push({
          file: buildProfilesPath,
          message: 'Found build-profile without instance attribute',
        })
        continue
      }
      if (!knownInstanceIds.has(instanceName)) {
        issues.push({
          file: buildProfilesPath,
          message: `Build profile references unknown instance: ${instanceName}`,
        })
      }
    }
  }

  if (!(await fileExists(topicsRoot))) {
    issues.push({ file: cfgPath, message: `Missing topics directory: ${topicsDir}` })
  }

  let checkedLinks = 0
  let topicFileCount = 0
  if (await fileExists(topicsRoot)) {
    const topicFiles = await collectTopicFiles(topicsRoot)
    topicFileCount = topicFiles.length
    for (const topicFile of topicFiles) {
      const content = await fs.readFile(topicFile, 'utf8')
      const targets = extractLinkTargets(content)
      for (const rawTarget of targets) {
        const normalized = normalizeTarget(rawTarget)
        if (!normalized) continue
        checkedLinks += 1
        const resolved = path.resolve(path.dirname(topicFile), normalized)
        if (!(await fileExists(resolved))) {
          issues.push({
            file: topicFile,
            message: `Broken topic link: ${rawTarget}`,
          })
        }
      }
    }
  }

  if (issues.length === 0) {
    console.log(
      `✓ Writerside references OK (${instanceProfiles.length} instances, ${topicFileCount} topics, ${checkedLinks} links checked)`
    )
    return
  }

  console.error(`✗ Writerside check found ${issues.length} issue(s):`)
  for (const issue of issues) {
    console.error(` - ${normalizePath(path.relative(repoRoot, issue.file))} :: ${issue.message}`)
  }
  process.exit(1)
}

main().catch((error) => {
  console.error('Writerside check failed:', error)
  process.exit(1)
})
