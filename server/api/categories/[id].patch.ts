export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const id = requireParam(event, 'id')
  const body = await readBody<{ name?: string, description?: string }>(event)
  await updateCategory(useDb(), session.tenantId, id, body ?? {})
  return { ok: true }
})
