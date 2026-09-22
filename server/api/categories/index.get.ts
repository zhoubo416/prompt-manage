export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  return { categories: await listCategories(useDb(), session.tenantId) }
})
