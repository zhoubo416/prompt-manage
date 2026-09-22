import { normalizeVariables } from '#shared/template'

/** 对外接口:按指定版本号取 Prompt,供需要固定版本的业务使用 */
export default defineEventHandler(async (event) => {
  const startedAt = Date.now()
  const promptKey = requireParam(event, 'key')
  const version = Number(requireParam(event, 'version'))
  if (!Number.isInteger(version) || version < 1) {
    apiError('validation_failed', '版本号不合法')
  }

  const apiKey = await requireApiKey(event)
  const sql = useDb()

  const [row] = await sql<{
    id: string
    name: string
    key: string
    version: number
    content: string
    variables: unknown
  }[]>`
    select p.id, p.name, p.key, v.version, v.content, v.variables
    from prompts p
    join prompt_versions v on v.prompt_id = p.id
    where p.tenant_id = ${apiKey.tenantId} and p.key = ${promptKey}
      and v.version = ${version} and v.status in ('published', 'archived')
  `
  if (!row) {
    apiError('not_found', '找不到该版本')
  }

  await recordUsage(sql, {
    tenantId: apiKey.tenantId,
    promptId: row.id,
    version: row.version,
    apiKeyId: apiKey.id,
    latency: Date.now() - startedAt,
  })

  return {
    key: row.key,
    name: row.name,
    version: row.version,
    template: row.content,
    variables: normalizeVariables(row.variables),
  }
})
