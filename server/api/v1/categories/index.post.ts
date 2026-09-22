/** 对外接口:新建分类 */
export default defineEventHandler(async (event) => {
  const apiKey = await requireApiKey(event, { write: true })
  const body = await readBody<{ name?: string, description?: string }>(event)
  const category = await createCategory(useDb(), apiKey.tenantId, body ?? {})
  return { category }
})
