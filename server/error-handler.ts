import type { H3Error, H3Event } from 'h3'

const DEFAULT_CODE_BY_STATUS: Record<number, string> = {
  400: 'validation_failed',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  500: 'internal_error',
}

/**
 * 统一的错误响应。
 * Nitro 默认会把堆栈、本机文件路径这些内部信息一起返回,而且自定义数据被塞在 data 里;
 * 这里收敛成固定结构:statusCode、statusMessage 保留(控制台前端依赖它们),
 * 再补一个稳定的 error.code / error.message 供三方按码分支。
 */
export default defineNitroErrorHandler((error: H3Error, event: H3Event) => {
  const status = typeof error.statusCode === 'number' && error.statusCode >= 400
    ? error.statusCode
    : 500
  const explicit = (error.data as { error?: { code?: string, message?: string } } | undefined)?.error
  const code = explicit?.code ?? DEFAULT_CODE_BY_STATUS[status] ?? 'internal_error'
  // 未预期的 500 统一用固定文案,不把内部报错细节发给调用方
  const message = status >= 500 && !explicit
    ? '服务器内部错误'
    : explicit?.message ?? error.statusMessage ?? '请求失败'

  if (status >= 500) {
    console.error(`[${status}] ${event.path}`, error)
  }

  setResponseStatus(event, status)
  setResponseHeader(event, 'content-type', 'application/json; charset=utf-8')
  return send(event, JSON.stringify({ statusCode: status, statusMessage: message, error: { code, message } }))
})
