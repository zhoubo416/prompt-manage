export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const query = getQuery(event)
  const sql = useDb()

  const conditions = [sql`p.tenant_id = ${session.tenantId}`]
  const categoryId = typeof query.categoryId === 'string' ? query.categoryId : ''
  if (categoryId) {
    conditions.push(sql`p.category_id = ${categoryId}`)
  }
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  if (search) {
    const like = `%${search}%`
    conditions.push(sql`(p.name ilike ${like} or p.key ilike ${like})`)
  }
  const where = conditions.reduce((acc, part) => sql`${acc} and ${part}`)

  const rows = await sql`
    select p.id, p.name, p.key, p.description, p.current_version, p.updated_at,
           c.id as category_id, c.name as category_name,
           (select count(*) from prompt_usage u
             where u.prompt_id = p.id and u.status = 'success') as usage_count,
           (select count(*) from prompt_versions v where v.prompt_id = p.id) as version_count,
           exists (select 1 from prompt_versions v
                    where v.prompt_id = p.id and v.status = 'draft') as has_draft
    from prompts p
    join categories c on c.id = p.category_id
    where ${where}
    order by p.updated_at desc
  `

  return {
    prompts: rows.map(row => ({
      id: row.id as string,
      name: row.name as string,
      key: row.key as string,
      description: row.description as string,
      categoryId: row.category_id as string,
      categoryName: row.category_name as string,
      currentVersion: row.current_version === null ? null : Number(row.current_version),
      versionCount: Number(row.version_count),
      usageCount: Number(row.usage_count),
      hasDraft: Boolean(row.has_draft),
      updatedAt: row.updated_at as Date,
    })),
  }
})
