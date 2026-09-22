// 脚本共用的数据库连接和密码哈希,保持和 server/utils 里的实现一致
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import postgres from 'postgres'

const scryptAsync = promisify(scrypt)

export function connect() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
  if (!url) {
    throw new Error('缺少 DATABASE_URL,请确认 .env 存在')
  }
  return postgres(url, { ssl: 'require', max: 2 })
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derived = await scryptAsync(password, salt, 64)
  return `scrypt$${salt}$${derived.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  const [scheme, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !hash) {
    return false
  }
  const derived = await scryptAsync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return derived.length === expected.length && timingSafeEqual(derived, expected)
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function generateApiKey() {
  const secret = randomBytes(24).toString('base64url')
  const key = `pk_live_${secret}`
  return { key, prefix: key.slice(0, 16), hash: sha256(key) }
}
