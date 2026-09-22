import { randomToken, sha256 } from './crypto'

const KEY_PREFIX = 'pk_live_'

export interface GeneratedApiKey {
  key: string
  prefix: string
  hash: string
}

/** 生成对外使用的 Key,返回的完整 Key 只在创建时展示一次 */
export function generateApiKey(): GeneratedApiKey {
  const key = `${KEY_PREFIX}${randomToken(24)}`
  return { key, prefix: key.slice(0, 16), hash: sha256(key) }
}

export function hashApiKey(key: string): string {
  return sha256(key)
}

/** 从 Authorization 头里取出 Bearer Key */
export function readBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null
  }
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim())
  return match?.[1] ?? null
}
