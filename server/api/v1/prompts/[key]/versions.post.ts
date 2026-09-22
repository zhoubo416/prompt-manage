/** 对外接口:保存草稿或发布,规则和管理后台共用 server/utils/versioning.ts */
export default defineEventHandler(async (event) => {
  const apiKey = await requireApiKey(event, { write: true })
  const promptKey = requireParam(event, 'key')
  const body = await readBody<{
    content?: string
    variables?: { name: string, required?: boolean, description?: string }[]
    publish?: boolean
  }>(event)
  const sql = useDb()

  const [prompt] = await sql<{ id: string }[]>`
    select id from prompts where tenant_id = ${apiKey.tenantId} and key = ${promptKey}
  `
  if (!prompt) {
    apiError('not_found', 'Prompt 不存在')
  }

  const result = await savePromptVersion(sql, {
    promptId: prompt.id,
    createdBy: null,
    content: body?.content,
    variables: body?.variables,
    publish: body?.publish === true,
  })
  return { key: promptKey, version: result.version, status: result.status }
})
