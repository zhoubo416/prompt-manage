/** 对外接口:列出当前租户的 Prompt,支持分类筛选和名称/Key 搜索 */
export default defineEventHandler(async (event) => {
  const apiKey = await requireApiKey(event)
  const query = getQuery(event)
  const { limit, offset } = parsePaging(query)
  const sql = useDb()

  const conditions = [sql`p.tenant_id = ${apiKey.tenantId}`]
  if (typeof query.categoryId === 'string' && query.categoryId) {
    conditions.push(sql`p.category_id = ${query.categoryId}`)
  } else if (typeof query.categoryName === 'string' && query.categoryName) {
    conditions.push(sql`c.name = ${query.categoryName}`)
  }
  if (typeof query.search === 'string' && query.search.trim()) {
    const like = `%${query.search.trim()}%`
    conditions.push(sql`(p.name ilike ${like} or p.key ilike ${like})`)
  }
  const where = conditions.reduce((acc, part) => sql`${acc} and ${part}`)

  const rows = await sql`
    select p.id, p.key, p.name, p.description, p.current_version, p.created_at, p.updated_at,
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
    limit ${limit} offset ${offset}
  `
  const [counted] = await sql<{ total: string }[]>`
    select count(*) as total
    from prompts p
    join categories c on c.id = p.category_id
    where ${where}
  `

  return {
    prompts: rows.map(row => promptSummary(row as never)),
    total: Number(counted?.total ?? 0),
  }
})
