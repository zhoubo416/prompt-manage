export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'admin')
  const sql = useDb()
  const rows = await sql`
    select id, name, key_prefix, access, status, last_used_at, created_at
    from api_keys
    where tenant_id = ${session.tenantId}
    order by created_at desc
  `
  return {
    apiKeys: rows.map(row => ({
      id: row.id as string,
      name: row.name as string,
      keyPrefix: row.key_prefix as string,
      access: row.access as 'read' | 'write',
      status: row.status as 'active' | 'disabled',
      lastUsedAt: row.last_used_at as Date | null,
      createdAt: row.created_at as Date,
    })),
  }
})
