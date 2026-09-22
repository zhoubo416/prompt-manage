import type { Sql } from 'postgres'

interface UsageInput {
  tenantId: string
  promptId: string
  version: number
  apiKeyId: string
  latency: number
}

/** 一次成功调用写一条记录,并刷新 API Key 的最后使用时间 */
export async function recordUsage(sql: Sql, input: UsageInput): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`
      insert into prompt_usage (tenant_id, prompt_id, prompt_version, api_key_id, status, latency)
      values (${input.tenantId}, ${input.promptId}, ${input.version},
              ${input.apiKeyId}, 'success', ${input.latency})
    `
    await tx`update api_keys set last_used_at = now() where id = ${input.apiKeyId}`
  })
}
