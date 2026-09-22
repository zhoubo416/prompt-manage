export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const body = await readBody<{ ids?: string[] }>(event)
  const ids = body?.ids ?? []
  if (!Array.isArray(ids) || ids.length === 0) {
    throw createError({ statusCode: 400, statusMessage: '缺少排序列表' })
  }

  const sql = useDb()
  const owned = await sql<{ id: string }[]>`
    select id from categories where tenant_id = ${session.tenantId}
  `
  const ownIds = new Set(owned.map(row => row.id))
  if (ids.some(id => !ownIds.has(id))) {
    throw createError({ statusCode: 400, statusMessage: '排序列表里有不属于当前租户的分类' })
  }

  await sql.begin(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx`update categories set sort_order = ${index} where id = ${id}`
    }
  })
  return { ok: true }
})
