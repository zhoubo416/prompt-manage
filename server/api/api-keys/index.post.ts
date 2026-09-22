export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'admin')
  const body = await readBody<{ name?: string }>(event)
  const name = assertText(body?.name, 'API Key 名称', 60)
  const issued = generateApiKey()
  const sql = useDb()

  const [row] = await sql<{ id: string }[]>`
    insert into api_keys (tenant_id, name, key_prefix, key_hash)
    values (${session.tenantId}, ${name}, ${issued.prefix}, ${issued.hash})
    returning id
  `
  if (!row) {
    throw createError({ statusCode: 500, statusMessage: '创建 API Key 失败' })
  }

  // 完整 Key 只在这里返回一次,数据库里只有前缀和哈希
  return { id: row.id, name, key: issued.key, keyPrefix: issued.prefix }
})
