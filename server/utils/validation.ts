import { createError } from 'h3'
import {
  isValidEmail,
  isValidPassword,
  isValidPromptKey,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  normalizePromptKey,
} from '#shared/validation'

export { normalizePromptKey }

export function assertPromptKey(key: string): string {
  const normalized = normalizePromptKey(key)
  if (!isValidPromptKey(normalized)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Key 只能使用小写字母、数字和连字符,长度 2 到 63 位',
    })
  }
  return normalized
}

export function assertEmail(email: string): string {
  const value = normalizeEmail(email)
  if (!isValidEmail(value)) {
    throw createError({ statusCode: 400, statusMessage: '邮箱格式不正确' })
  }
  return value
}

export function assertPassword(password: string): string {
  if (!isValidPassword(password)) {
    throw createError({ statusCode: 400, statusMessage: `密码至少 ${MIN_PASSWORD_LENGTH} 位` })
  }
  return password
}

export function assertText(value: unknown, field: string, max = 200): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: `${field}不能为空` })
  }
  const text = value.trim()
  if (text.length > max) {
    throw createError({ statusCode: 400, statusMessage: `${field}不能超过 ${max} 个字符` })
  }
  return text
}
