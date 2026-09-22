export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'admin')
  const id = requireParam(event, 'id')
  const body = await readBody<{ moveToCategoryId?: string | null }>(event)
    .catch((): { moveToCategoryId?: string | null } => ({}))
  const query = getQuery(event)
  const fromQuery = typeof query.moveToCategoryId === 'string' ? query.moveToCategoryId : null
  const moveTo = body?.moveToCategoryId ?? fromQuery
  const result = await deleteCategory(useDb(), session.tenantId, id, moveTo || null)
  return { ok: true, movedPrompts: result.movedPrompts }
})
