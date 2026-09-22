/** 对外接口:列出分类 */
export default defineEventHandler(async (event) => {
  const apiKey = await requireApiKey(event)
  return { categories: await listCategories(useDb(), apiKey.tenantId) }
})
