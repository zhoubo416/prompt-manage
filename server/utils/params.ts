import type { H3Event } from 'h3'

/** 取路径参数并保证拿到的是字符串,避免到处写 string | undefined 的判断 */
export function requireParam(event: H3Event, name: string): string {
  const value = getRouterParam(event, name)
  if (!value) {
    throw createError({ statusCode: 400, statusMessage: `缺少参数 ${name}` })
  }
  return value
}
