export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const sql = useDb()
  const rows = await sql`
    select c.id, c.name, c.description, c.sort_order,
           (select count(*) from prompts p where p.category_id = c.id) as prompt_count
    from categories c
    where c.tenant_id = ${session.tenantId}
    order by c.sort_order, c.name
  `
  return {
    categories: rows.map(row => ({
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      sortOrder: Number(row.sort_order),
      promptCount: Number(row.prompt_count),
    })),
  }
})
