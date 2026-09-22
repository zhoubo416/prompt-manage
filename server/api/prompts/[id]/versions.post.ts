import { mergeVariables } from '#shared/template'

/**
 * 保存或发布版本。
 * 传 content 表示保存:最新版本还是草稿就更新它,否则新建下一个版本号。
 * 传 publish 表示把当前草稿发布出去,发布后原来的 Published 版本转为 Archived。
 */
export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const id = requireParam(event, 'id')
  const body = await readBody<{
    content?: string
    variables?: { name: string, required?: boolean, description?: string }[]
    publish?: boolean
  }>(event)
  const publish = body?.publish === true
  const hasContent = typeof body?.content === 'string' && body.content.trim().length > 0

  if (!hasContent && !publish) {
    throw createError({ statusCode: 400, statusMessage: '没有需要保存的内容' })
  }

  const sql = useDb()
  const result = await sql.begin(async (tx) => {
    const [prompt] = await tx<{ id: string }[]>`
      select id from prompts where id = ${id} and tenant_id = ${session.tenantId} for update
    `
    if (!prompt) {
      throw createError({ statusCode: 404, statusMessage: 'Prompt 不存在' })
    }

    const [latest] = await tx<{ id: string, version: number, status: string }[]>`
      select id, version, status from prompt_versions
      where prompt_id = ${id} order by version desc limit 1
    `
    const [user] = await tx<{ id: string }[]>`
      select id from users where account_id = ${session.accountId} and tenant_id = ${session.tenantId}
    `

    let targetId = latest?.id ?? null
    let targetVersion = latest?.version ?? 0

    if (hasContent) {
      const content = assertText(body?.content, 'Prompt 正文', 20000)
      const variables = mergeVariables(content, body?.variables ?? [])
      if (latest && latest.status === 'draft') {
        await tx`
          update prompt_versions set content = ${content}, variables = ${toJson(tx, variables)}
          where id = ${latest.id}
        `
      } else {
        const nextVersion = (latest?.version ?? 0) + 1
        const [created] = await tx<{ id: string, version: number }[]>`
          insert into prompt_versions (prompt_id, version, content, variables, status, created_by)
          values (${id}, ${nextVersion}, ${content}, ${toJson(tx, variables)}, 'draft', ${user?.id ?? null})
          returning id, version
        `
        if (!created) {
          throw createError({ statusCode: 500, statusMessage: '创建版本失败' })
        }
        targetId = created.id
        targetVersion = created.version
      }
    }

    if (!targetId) {
      throw createError({ statusCode: 400, statusMessage: '还没有可发布的版本' })
    }

    if (publish) {
      const [target] = await tx<{ status: string }[]>`
        select status from prompt_versions where id = ${targetId}
      `
      if (!target || target.status !== 'draft') {
        throw createError({ statusCode: 409, statusMessage: '没有待发布的草稿版本' })
      }
      await tx`
        update prompt_versions set status = 'archived'
        where prompt_id = ${id} and status = 'published'
      `
      await tx`update prompt_versions set status = 'published' where id = ${targetId}`
      await tx`
        update prompts set current_version = ${targetVersion}, updated_at = now() where id = ${id}
      `
    } else {
      await tx`update prompts set updated_at = now() where id = ${id}`
    }

    return { version: targetVersion, published: publish }
  })

  return result
})
