/** 对外接口:修改分类名称或说明 */
export default defineEventHandler(async (event) => {
  const apiKey = await requireApiKey(event, { write: true })
  const id = requireParam(event, 'id')
  const body = await readBody<{ name?: string, description?: string }>(event)
  const category = await updateCategory(useDb(), apiKey.tenantId, id, body ?? {})
  return { category }
})
