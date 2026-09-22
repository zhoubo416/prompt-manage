import type { JSONValue, Sql, TransactionSql } from 'postgres'

/**
 * 写 jsonb 列时统一用这个函数。
 * 自己 JSON.stringify 再传字符串会被 postgres.js 当成 JSON 字符串再编码一次,
 * 存进去就变成了带引号的字符串而不是数组。
 */
export function toJson(sql: Sql | TransactionSql, value: unknown) {
  return (sql as Sql).json(value as JSONValue)
}
