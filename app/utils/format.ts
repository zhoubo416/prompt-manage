export function formatNumber(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString('zh-CN')
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  const pad = (input: number) => String(input).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  const pad = (input: number) => String(input).padStart(2, '0')
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) {
    return '从未使用'
  }
  const diff = Date.now() - new Date(value).getTime()
  const minute = 60 * 1000
  if (diff < minute) {
    return '刚刚'
  }
  if (diff < 60 * minute) {
    return `${Math.floor(diff / minute)} 分钟前`
  }
  if (diff < 24 * 60 * minute) {
    return `${Math.floor(diff / (60 * minute))} 小时前`
  }
  return formatDate(value)
}

export function errorMessage(error: unknown): string {
  const source = error as {
    data?: { statusMessage?: string, message?: string }
    statusMessage?: string
  }
  return source?.data?.statusMessage ?? source?.statusMessage ?? source?.data?.message ?? '请求失败,请稍后再试'
}
