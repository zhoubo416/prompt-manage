import postgres from 'postgres'

let client: postgres.Sql | undefined

/** 全进程共用一个连接池,租户过滤由各查询自己带上 tenant_id */
export function useDb(): postgres.Sql {
  if (!client) {
    const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
    if (!url) {
      throw new Error('缺少 DATABASE_URL,请确认 .env 存在')
    }
    client = postgres(url, { ssl: 'require', max: 8 })
  }
  return client
}
