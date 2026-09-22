import type { Sql } from 'postgres'
import { mergeVariables } from '#shared/template'
import { businessError } from './errors'
import { toJson } from './json'
import { assertText } from './validation'

export interface SaveVersionInput {
  promptId: string
  createdBy: string | null
  content?: string
  variables?: { name: string, required?: boolean, description?: string }[]
  publish: boolean
}

export interface SaveVersionResult {
  version: number
  status: 'draft' | 'published'
}

/**
 * 保存或发布版本,管理后台和对外接口共用这一份实现。
 * 传 content 表示保存:最新版本还是草稿就原地更新,否则以最大版本号加 1 新建草稿。
 * 传 publish 表示把当前草稿发布出去,发布后原来的 Published 版本转为 Archived。
 */
export async function savePromptVersion(
  sql: Sql,
  input: SaveVersionInput,
): Promise<SaveVersionResult> {
  const hasContent = typeof input.content === 'string' && input.content.trim().length > 0
  if (!hasContent && !input.publish) {
    businessError('validation_failed', '没有需要保存的内容')
  }

  return sql.begin(async (tx) => {
    const [latest] = await tx<{ id: string, version: number, status: string }[]>`
      select id, version, status from prompt_versions
      where prompt_id = ${input.promptId} order by version desc limit 1
    `
    let targetId = latest?.id ?? null
    let targetVersion = latest?.version ?? 0

    if (hasContent) {
      const content = assertText(input.content, 'Prompt 正文', 20000)
      const variables = mergeVariables(content, input.variables ?? [])
      if (latest && latest.status === 'draft') {
        await tx`
          update prompt_versions set content = ${content}, variables = ${toJson(tx, variables)}
          where id = ${latest.id}
        `
      } else {
        const nextVersion = (latest?.version ?? 0) + 1
        const [created] = await tx<{ id: string, version: number }[]>`
          insert into prompt_versions (prompt_id, version, content, variables, status, created_by)
          values (${input.promptId}, ${nextVersion}, ${content}, ${toJson(tx, variables)},
                  'draft', ${input.createdBy})
          returning id, version
        `
        if (!created) {
          businessError('internal_error', '创建版本失败')
        }
        targetId = created.id
        targetVersion = created.version
      }
    }

    if (!targetId) {
      businessError('validation_failed', '还没有可发布的版本')
    }

    if (!input.publish) {
      await tx`update prompts set updated_at = now() where id = ${input.promptId}`
      return { version: targetVersion, status: 'draft' as const }
    }

    const [target] = await tx<{ status: string }[]>`
      select status from prompt_versions where id = ${targetId}
    `
    if (!target || target.status !== 'draft') {
      businessError('conflict', '没有待发布的草稿版本')
    }
    await tx`
      update prompt_versions set status = 'archived'
      where prompt_id = ${input.promptId} and status = 'published'
    `
    await tx`update prompt_versions set status = 'published' where id = ${targetId}`
    await tx`
      update prompts set current_version = ${targetVersion}, updated_at = now()
      where id = ${input.promptId}
    `
    return { version: targetVersion, status: 'published' as const }
  })
}
