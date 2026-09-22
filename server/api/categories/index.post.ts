export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const body = await readBody<{ name?: string, description?: string }>(event)
  const category = await createCategory(useDb(), session.tenantId, body ?? {})
  return { id: category.id }
})
