import type { H3Event } from 'h3'
import type { Sql, TransactionSql } from 'postgres'
import { hashApiKey, readBearerToken } from './apikey'
import { useDb } from './db'

export type ApiErrorCode
  = | 'unauthorized'
    | 'forbidden'
    | 'validation_failed'
    | 'not_found'
    | 'conflict'
    | 'internal_error'

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  validation_failed: 400,
  not_found: 404,
  conflict: 409,
  internal_error: 500,
}

/**
 * 对外接口的错误统一带 error.code,三方按 code 分支处理就行,不用去解析中文文案。
 * 结构是增量的:原有的 statusCode 和 statusMessage 保持不变。
 */
export function apiError(code: ApiErrorCode, message: string): never {
  throw createError({
    statusCode: STATUS_BY_CODE[code],
    statusMessage: message,
    data: { error: { code, message } },
  })
}

export interface ApiKeyContext {
  id: string
  tenantId: string
  access: 'read' | 'write'
}

/** 认证并解析租户:租户只由 Key 决定,请求参数无法指定 */
export async function requireApiKey(
  event: H3Event,
  options: { write?: boolean } = {},
): Promise<ApiKeyContext> {
  const token = readBearerToken(getHeader(event, 'authorization'))
  if (!token) {
    apiError('unauthorized', '缺少 API Key')
  }

  const sql = useDb()
  const [row] = await sql<{ id: string, tenant_id: string, status: string, access: 'read' | 'write' }[]>`
    select id, tenant_id, status, access from api_keys where key_hash = ${hashApiKey(token)}
  `
  if (!row || row.status !== 'active') {
    apiError('unauthorized', 'API Key 无效或已禁用')
  }
  if (options.write && row.access !== 'write') {
    apiError('forbidden', '当前 API Key 只有查询权限,不能调用维护接口')
  }

  return { id: row.id, tenantId: row.tenant_id, access: row.access }
}

export interface PromptSummaryRow {
  key: string
  name: string
  description: string
  category_id: string
  category_name: string
  current_version: number | null
  version_count: string | number
  has_draft: boolean
  usage_count: string | number
  created_at: Date
  updated_at: Date
}

export interface PromptSummary {
  key: string
  name: string
  description: string
  categoryId: string
  categoryName: string
  currentVersion: number | null
  versionCount: number
  hasDraft: boolean
  usageCount: number
  createdAt: Date
  updatedAt: Date
}

export function promptSummary(row: PromptSummaryRow): PromptSummary {
  return {
    key: row.key,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    categoryName: row.category_name,
    currentVersion: row.current_version === null ? null : Number(row.current_version),
    versionCount: Number(row.version_count),
    hasDraft: Boolean(row.has_draft),
    usageCount: Number(row.usage_count),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function fetchPromptSummary(
  sql: Sql | TransactionSql,
  tenantId: string,
  key: string,
): Promise<PromptSummary | null> {
  const [row] = await (sql as Sql)<PromptSummaryRow[]>`
    select p.id, p.key, p.name, p.description, p.current_version, p.created_at, p.updated_at,
           c.id as category_id, c.name as category_name,
           (select count(*) from prompt_usage u
             where u.prompt_id = p.id and u.status = 'success') as usage_count,
           (select count(*) from prompt_versions v where v.prompt_id = p.id) as version_count,
           exists (select 1 from prompt_versions v
                    where v.prompt_id = p.id and v.status = 'draft') as has_draft
    from prompts p
    join categories c on c.id = p.category_id
    where p.tenant_id = ${tenantId} and p.key = ${key}
  `
  return row ? promptSummary(row) : null
}

/** 分类可以按 id 或名称指定,同时传时以 id 为准 */
export async function resolveCategoryId(
  sql: Sql | TransactionSql,
  tenantId: string,
  input: { categoryId?: string | null, categoryName?: string | null },
): Promise<string> {
  const client = sql as Sql
  if (input.categoryId) {
    const [row] = await client<{ id: string }[]>`
      select id from categories where id = ${input.categoryId} and tenant_id = ${tenantId}
    `
    if (!row) {
      apiError('validation_failed', '分类不存在')
    }
    return row.id
  }
  if (input.categoryName) {
    const [row] = await client<{ id: string }[]>`
      select id from categories where name = ${input.categoryName} and tenant_id = ${tenantId}
    `
    if (!row) {
      apiError('validation_failed', `分类「${input.categoryName}」不存在`)
    }
    return row.id
  }
  apiError('validation_failed', '需要指定 categoryId 或 categoryName')
}

export function parsePaging(query: Record<string, unknown>): { limit: number, offset: number } {
  const rawLimit = Number(query.limit ?? 50)
  const rawOffset = Number(query.offset ?? 0)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 200) : 50
  const offset = Number.isFinite(rawOffset) ? Math.max(Math.trunc(rawOffset), 0) : 0
  return { limit, offset }
}
