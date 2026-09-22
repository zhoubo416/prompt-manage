/** 对外接口:删除 Prompt,版本历史和调用记录一起删除 */
export default defineEventHandler(async (event) => {
  const apiKey = await requireApiKey(event, { write: true })
  const promptKey = requireParam(event, 'key')
  const sql = useDb()

  const deleted = await sql`
    delete from prompts where tenant_id = ${apiKey.tenantId} and key = ${promptKey}
    returning id
  `
  if (deleted.length === 0) {
    apiError('not_found', 'Prompt 不存在')
  }
  return { deleted: true, key: promptKey }
})
