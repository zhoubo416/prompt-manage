import { describe, expect, it } from 'vitest'
import { generateApiKey, hashApiKey, readBearerToken } from '../server/utils/apikey'

describe('generateApiKey', () => {
  it('生成带前缀的 Key,哈希稳定且不外泄 Key 本身', () => {
    const issued = generateApiKey()
    expect(issued.key.startsWith('pk_live_')).toBe(true)
    expect(issued.prefix).toBe(issued.key.slice(0, 16))
    expect(issued.hash).toBe(hashApiKey(issued.key))
    expect(issued.hash).not.toContain(issued.key)
    expect(issued.hash).toHaveLength(64)
  })

  it('每次生成的 Key 都不同', () => {
    expect(generateApiKey().key).not.toBe(generateApiKey().key)
  })
})

describe('readBearerToken', () => {
  it('解析 Bearer 头', () => {
    expect(readBearerToken('Bearer pk_live_abc')).toBe('pk_live_abc')
    expect(readBearerToken('bearer pk_live_abc')).toBe('pk_live_abc')
    expect(readBearerToken('pk_live_abc')).toBeNull()
    expect(readBearerToken(undefined)).toBeNull()
  })
})
