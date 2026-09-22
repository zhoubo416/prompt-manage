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

/** 校验失败统一带上 error.code,和对外接口的错误约定保持一致 */
function invalid(message: string): never {
  throw createError({
    statusCode: 400,
    statusMessage: message,
    data: { error: { code: 'validation_failed', message } },
  })
}

export function assertPromptKey(key: string): string {
  const normalized = normalizePromptKey(key)
  if (!isValidPromptKey(normalized)) {
    invalid('Key 只能使用小写字母、数字和连字符,长度 2 到 63 位')
  }
  return normalized
}

export function assertEmail(email: string): string {
  const value = normalizeEmail(email)
  if (!isValidEmail(value)) {
    invalid('邮箱格式不正确')
  }
  return value
}

export function assertPassword(password: string): string {
  if (!isValidPassword(password)) {
    invalid(`密码至少 ${MIN_PASSWORD_LENGTH} 位`)
  }
  return password
}

export function assertText(value: unknown, field: string, max = 200): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    invalid(`${field}不能为空`)
  }
  const text = value.trim()
  if (text.length > max) {
    invalid(`${field}不能超过 ${max} 个字符`)
  }
  return text
}
