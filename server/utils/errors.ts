/**
 * 服务端业务错误。管理接口和对外接口共用同一批错误码,
 * 这样同一件错事在两边拿到的 code 一致,前端和第三方都不用各判一套。
 */
export type ErrorCode
  = | 'validation_failed'
    | 'not_found'
    | 'conflict'
    | 'forbidden'
    | 'internal_error'

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  validation_failed: 400,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  internal_error: 500,
}

export function businessError(code: ErrorCode, message: string): never {
  throw createError({
    statusCode: STATUS_BY_CODE[code],
    statusMessage: message,
    data: { error: { code, message } },
  })
}
