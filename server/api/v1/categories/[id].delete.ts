/** 对外接口:删除分类,分类下有 Prompt 时必须带迁移目标 */
export default defineEventHandler(async (event) => {
  const apiKey = await requireApiKey(event, { write: true })
  const id = requireParam(event, 'id')
  const query = getQuery(event)
  const body = await readBody<{ moveToCategoryId?: string }>(event).catch(
    (): { moveToCategoryId?: string } => ({}),
  )
  const fromQuery = typeof query.moveToCategoryId === 'string' ? query.moveToCategoryId : null
  const moveTo = body?.moveToCategoryId ?? fromQuery

  const result = await deleteCategory(useDb(), apiKey.tenantId, id, moveTo || null)
  return { deleted: true, movedPrompts: result.movedPrompts }
})
