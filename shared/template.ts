/** 变量识别与替换的前后端共用实现,保证编辑页预览和 API 返回的口径一致 */

export interface PromptVariable {
  name: string
  type: 'text'
  required: boolean
  description: string
}

const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g
const VALID_NAME = /^[A-Za-z_][A-Za-z0-9_.-]*$/

/** 从正文里按出现顺序提取变量名,去重并忽略不合法的写法 */
export function extractVariableNames(content: string): string[] {
  const names: string[] = []
  for (const match of content.matchAll(PLACEHOLDER)) {
    const name = match[1]?.trim()
    if (name && VALID_NAME.test(name) && !names.includes(name)) {
      names.push(name)
    }
  }
  return names
}

/**
 * 以正文识别出的变量为准合并定义:正文里没有的丢弃,缺少信息的使用默认值,
 * 用户补充过的类型、是否必填和说明保留下来。
 */
export function mergeVariables(
  content: string,
  provided: Partial<PromptVariable>[] = [],
): PromptVariable[] {
  return extractVariableNames(content).map((name) => {
    const existing = provided.find(item => item?.name === name)
    return {
      name,
      type: 'text' as const,
      required: existing?.required ?? true,
      description: existing?.description ?? '',
    }
  })
}

/** 预览用:把变量替换成样例值,没给值的变量保持原样 */
export function renderTemplate(content: string, values: Record<string, string>): string {
  return content.replace(PLACEHOLDER, (raw, name: string) => {
    const key = name.trim()
    const value = values[key]
    return value === undefined || value === '' ? raw : value
  })
}

/** 把数据库里读回来的 jsonb 收拢成确定的变量结构 */
export function normalizeVariables(value: unknown): PromptVariable[] {
  const list = Array.isArray(value) ? value : []
  return list.flatMap((item) => {
    const source = item as Partial<PromptVariable> | null
    if (!source || typeof source.name !== 'string') {
      return []
    }
    return [{
      name: source.name,
      type: 'text' as const,
      required: source.required !== false,
      description: typeof source.description === 'string' ? source.description : '',
    }]
  })
}
