import postgres from 'postgres'

let client: postgres.Sql | undefined

/** 全进程共用一个连接池,租户过滤由各查询自己带上 tenant_id */
export function useDb(): postgres.Sql {
  if (!client) {
    const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
    if (!url) {
      throw new Error('缺少 DATABASE_URL,请确认 .env 存在')
    }
    // 关掉 notice 通知(建表语句的 "already exists, skipping" 之类),异常仍然正常抛出
    client = postgres(url, { ssl: 'require', max: 8, onnotice: () => {} })
  }
  return client
}
