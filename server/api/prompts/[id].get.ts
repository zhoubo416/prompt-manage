import { normalizeVariables } from '#shared/template'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const id = requireParam(event, 'id')
  const sql = useDb()

  const [prompt] = await sql`
    select p.id, p.name, p.key, p.description, p.current_version, p.created_at, p.updated_at,
           c.id as category_id, c.name as category_name,
           (select count(*) from prompt_usage u
             where u.prompt_id = p.id and u.status = 'success') as usage_count
    from prompts p
    join categories c on c.id = p.category_id
    where p.id = ${id} and p.tenant_id = ${session.tenantId}
  `
  if (!prompt) {
    throw createError({ statusCode: 404, statusMessage: 'Prompt 不存在' })
  }

  const versions = await sql`
    select id, version, content, variables, status, created_at
    from prompt_versions
    where prompt_id = ${id}
    order by version desc
  `

  return {
    prompt: {
      id: prompt.id as string,
      name: prompt.name as string,
      key: prompt.key as string,
      description: prompt.description as string,
      categoryId: prompt.category_id as string,
      categoryName: prompt.category_name as string,
      currentVersion: prompt.current_version === null ? null : Number(prompt.current_version),
      usageCount: Number(prompt.usage_count),
      createdAt: prompt.created_at as Date,
      updatedAt: prompt.updated_at as Date,
    },
    versions: versions.map(row => ({
      id: row.id as string,
      version: Number(row.version),
      content: row.content as string,
      variables: normalizeVariables(row.variables),
      status: row.status as 'draft' | 'published' | 'archived',
      createdAt: row.created_at as Date,
    })),
  }
})
