export type UsageRange = 'today' | 'week' | 'month' | 'all'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const query = getQuery(event)
  const requested = String(query.range ?? 'today')
  const range: UsageRange
    = requested === 'week' || requested === 'month' || requested === 'all' ? requested : 'today'
  const sql = useDb()

  const [totals] = await sql<{
    today: string
    week: string
    month: string
    total: string
  }[]>`
    select
      count(*) filter (
        where u.created_at >= date_trunc('day', now() at time zone 'Asia/Shanghai') at time zone 'Asia/Shanghai'
      ) as today,
      count(*) filter (
        where u.created_at >= date_trunc('week', now() at time zone 'Asia/Shanghai') at time zone 'Asia/Shanghai'
      ) as week,
      count(*) filter (
        where u.created_at >= date_trunc('month', now() at time zone 'Asia/Shanghai') at time zone 'Asia/Shanghai'
      ) as month,
      count(*) as total
    from prompt_usage u
    where u.tenant_id = ${session.tenantId} and u.status = 'success'
  `

  // 时间范围统一在 SQL 里按 Asia/Shanghai 的日、周、月边界计算,避免前后端口径不一致
  const ranking = await sql`
    with bounds as (
      select
        date_trunc('day', now() at time zone 'Asia/Shanghai') at time zone 'Asia/Shanghai' as day_start,
        date_trunc('week', now() at time zone 'Asia/Shanghai') at time zone 'Asia/Shanghai' as week_start,
        date_trunc('month', now() at time zone 'Asia/Shanghai') at time zone 'Asia/Shanghai' as month_start
    )
    select p.id, p.name, p.key, count(u.id) as count
    from prompts p
    cross join bounds b
    left join prompt_usage u on u.prompt_id = p.id
      and u.status = 'success'
      and u.created_at >= case ${range}::text
          when 'today' then b.day_start
          when 'week' then b.week_start
          when 'month' then b.month_start
          else '-infinity'::timestamptz
        end
    where p.tenant_id = ${session.tenantId}
    group by p.id, p.name, p.key
    order by count desc, p.name
    limit 10
  `

  return {
    range,
    totals: {
      today: Number(totals?.today ?? 0),
      week: Number(totals?.week ?? 0),
      month: Number(totals?.month ?? 0),
      total: Number(totals?.total ?? 0),
    },
    ranking: ranking.map(row => ({
      id: row.id as string,
      name: row.name as string,
      key: row.key as string,
      count: Number(row.count),
    })),
  }
})
