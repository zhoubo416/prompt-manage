import { describe, expect, it } from 'vitest'
import { isValidEmail, isValidPromptKey, normalizePromptKey } from '../shared/validation'

describe('normalizePromptKey', () => {
  it('把用户输入的 Key 规范成小写连字符形式', () => {
    expect(normalizePromptKey('  Customer_Analysis ')).toBe('customer-analysis')
    expect(normalizePromptKey('客户 分析')).toBe('')
    expect(normalizePromptKey('code--review')).toBe('code-review')
  })
})

describe('isValidPromptKey', () => {
  it('只接受规范化之后的 Key', () => {
    expect(isValidPromptKey('customer-analysis')).toBe(true)
    expect(isValidPromptKey('a')).toBe(false)
    expect(isValidPromptKey('Customer_Analysis')).toBe(false)
  })
})

describe('isValidEmail', () => {
  it('校验邮箱格式', () => {
    expect(isValidEmail('demo@example.com')).toBe(true)
    expect(isValidEmail('demo@example')).toBe(false)
  })
})
