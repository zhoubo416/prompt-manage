/**
 * 对外接口清单。公开页面 /docs 展示的内容、测试对实现的核对都用这一份,
 * 接口有增减时先改这里,再改实现;测试会检查两边是否一一对应。
 */

export const API_BASE_PATH = '/api/v1'

export type ApiMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'
export type ApiErrorCode
  = | 'unauthorized'
    | 'forbidden'
    | 'validation_failed'
    | 'not_found'
    | 'conflict'
    | 'internal_error'

export interface ApiDocParam {
  name: string
  in: 'path' | 'query' | 'body'
  type: string
  required?: boolean
  description: string
}

export interface ApiDocEndpoint {
  id: string
  method: ApiMethod
  path: string
  title: string
  /** read 用只读 Key 就能调,write 需要读写 Key */
  kind: 'read' | 'write'
  description: string
  params: ApiDocParam[]
  request?: string
  response: string
  /** 实现这个接口的文件,测试用它核对清单和实现是否一致 */
  routeFile: string
}

export const apiErrorCodes: { code: ApiErrorCode, status: number, meaning: string }[] = [
  { code: 'unauthorized', status: 401, meaning: '缺少 API Key,或 Key 无效、已禁用' },
  { code: 'forbidden', status: 403, meaning: '只读 Key 调用了维护接口' },
  { code: 'validation_failed', status: 400, meaning: '字段不合法、版本号不是正整数、引用的分类不存在' },
  { code: 'not_found', status: 404, meaning: 'Prompt、版本或分类不存在,或没有可用的发布版本' },
  { code: 'conflict', status: 409, meaning: 'Key 重复、分类重名、分类下还有 Prompt' },
  { code: 'internal_error', status: 500, meaning: '服务端未预期的错误' },
]

export const apiEndpoints: ApiDocEndpoint[] = [
  {
    id: 'list-prompts',
    method: 'GET',
    path: '/prompts',
    title: '列出 Prompt',
    kind: 'read',
    description: '按最近更新时间倒序列出当前租户的 Prompt,支持分类筛选和名称/Key 搜索。',
    params: [
      { name: 'categoryId', in: 'query', type: 'uuid', description: '按分类 ID 过滤' },
      { name: 'categoryName', in: 'query', type: 'string', description: '按分类名称过滤,和 categoryId 二选一' },
      { name: 'search', in: 'query', type: 'string', description: '同时匹配名称和 Key' },
      { name: 'limit', in: 'query', type: 'number', description: '每页条数,默认 50,最大 200' },
      { name: 'offset', in: 'query', type: 'number', description: '偏移量,默认 0' },
    ],
    response: `{
  "prompts": [
    {
      "key": "customer-analysis",
      "name": "客户信息分析",
      "description": "分析客户资料,提取客户需求和潜在风险",
      "categoryId": "5f1c9c3e-…",
      "categoryName": "客户",
      "currentVersion": 3,
      "versionCount": 3,
      "hasDraft": false,
      "usageCount": 12832,
      "createdAt": "2026-09-20T02:11:00.000Z",
      "updatedAt": "2026-09-20T02:11:00.000Z"
    }
  ],
  "total": 1
}`,
    routeFile: 'server/api/v1/prompts/index.get.ts',
  },
  {
    id: 'get-prompt',
    method: 'GET',
    path: '/prompts/{key}',
    title: '取最新发布版本',
    kind: 'read',
    description: '业务系统获取 Prompt 的主要接口。没有发布版本时返回 404,不会返回草稿。成功返回会记一次调用。',
    params: [
      { name: 'key', in: 'path', type: 'string', required: true, description: 'Prompt 的 Key' },
    ],
    response: `{
  "key": "customer-analysis",
  "name": "客户信息分析",
  "version": 3,
  "template": "你是一名专业的客户分析助手……",
  "variables": [
    { "name": "customer_info", "type": "text", "required": true }
  ]
}`,
    routeFile: 'server/api/v1/prompts/[key].get.ts',
  },
  {
    id: 'list-versions',
    method: 'GET',
    path: '/prompts/{key}/versions',
    title: '版本历史',
    kind: 'read',
    description: '按版本号倒序返回版本元信息。正文不在这里返回,需要时用指定版本接口取,避免一次拉回大量内容。',
    params: [
      { name: 'key', in: 'path', type: 'string', required: true, description: 'Prompt 的 Key' },
    ],
    response: `{
  "key": "customer-analysis",
  "versions": [
    {
      "version": 3,
      "status": "published",
      "variables": [{ "name": "customer_info", "type": "text", "required": true }],
      "createdAt": "2026-09-20T02:11:00.000Z"
    }
  ]
}`,
    routeFile: 'server/api/v1/prompts/[key]/versions.get.ts',
  },
  {
    id: 'get-version',
    method: 'GET',
    path: '/prompts/{key}/versions/{version}',
    title: '取指定版本',
    kind: 'read',
    description: '需要固定 Prompt 版本的业务用这个接口。已归档的历史版本可以取到,草稿取不到。成功返回会记一次调用。',
    params: [
      { name: 'key', in: 'path', type: 'string', required: true, description: 'Prompt 的 Key' },
      { name: 'version', in: 'path', type: 'number', required: true, description: '版本号,从 1 开始' },
    ],
    response: `{
  "key": "customer-analysis",
  "name": "客户信息分析",
  "version": 2,
  "template": "……",
  "variables": []
}`,
    routeFile: 'server/api/v1/prompts/[key]/versions/[version].get.ts',
  },
  {
    id: 'list-categories',
    method: 'GET',
    path: '/categories',
    title: '列出分类',
    kind: 'read',
    description: '列出当前租户的分类,带每个分类下的 Prompt 数量。',
    params: [],
    response: `{
  "categories": [
    {
      "id": "5f1c9c3e-…",
      "name": "客户",
      "description": "客户资料分析与跟进",
      "sortOrder": 0,
      "promptCount": 12
    }
  ]
}`,
    routeFile: 'server/api/v1/categories/index.get.ts',
  },
  {
    id: 'create-prompt',
    method: 'POST',
    path: '/prompts',
    title: '新建 Prompt',
    kind: 'write',
    description:
      '创建 Prompt 并可同时发布。variables 可以省略,服务端从正文里的 {{占位符}} 识别并补默认值。同一个租户下 Key 重复返回 409。',
    params: [
      { name: 'name', in: 'body', type: 'string', required: true, description: '展示名称,最长 100 字' },
      { name: 'key', in: 'body', type: 'string', required: true, description: '对外调用的 Key,小写字母、数字和连字符' },
      { name: 'content', in: 'body', type: 'string', required: true, description: 'Prompt 正文,变量用 {{name}} 占位' },
      { name: 'categoryId', in: 'body', type: 'uuid', description: '分类 ID,和 categoryName 二选一' },
      { name: 'categoryName', in: 'body', type: 'string', description: '分类名称' },
      { name: 'description', in: 'body', type: 'string', description: '描述,最长 500 字' },
      { name: 'variables', in: 'body', type: 'array', description: '变量定义,可省略' },
      { name: 'publish', in: 'body', type: 'boolean', description: '为 true 时直接发布,否则创建草稿' },
    ],
    request: `{
  "name": "客户信息分析",
  "key": "customer-analysis",
  "categoryName": "客户",
  "description": "分析客户资料,提取客户需求和潜在风险",
  "content": "你是一名专业的客户分析助手。\\n\\n请分析以下客户信息:\\n\\n{{customer_info}}",
  "publish": true
}`,
    response: `{
  "prompt": {
    "key": "customer-analysis",
    "name": "客户信息分析",
    "description": "分析客户资料,提取客户需求和潜在风险",
    "categoryId": "5f1c9c3e-…",
    "categoryName": "客户",
    "currentVersion": 1,
    "versionCount": 1,
    "hasDraft": false,
    "usageCount": 0,
    "createdAt": "2026-09-22T06:00:00.000Z",
    "updatedAt": "2026-09-22T06:00:00.000Z"
  },
  "version": 1,
  "status": "published"
}`,
    routeFile: 'server/api/v1/prompts/index.post.ts',
  },
  {
    id: 'update-prompt',
    method: 'PATCH',
    path: '/prompts/{key}',
    title: '修改 Prompt',
    kind: 'write',
    description: '只改元信息,正文走保存版本接口。为了避免打断已经接入的调用方,Key 不能通过接口修改。',
    params: [
      { name: 'key', in: 'path', type: 'string', required: true, description: 'Prompt 的 Key' },
      { name: 'name', in: 'body', type: 'string', description: '新的名称' },
      { name: 'description', in: 'body', type: 'string', description: '新的描述' },
      { name: 'categoryId', in: 'body', type: 'uuid', description: '新的分类 ID' },
      { name: 'categoryName', in: 'body', type: 'string', description: '新的分类名称' },
    ],
    request: `{ "name": "客户信息分析", "description": "新的描述" }`,
    response: `{ "prompt": { "key": "customer-analysis", "name": "客户信息分析", "currentVersion": 3 } }`,
    routeFile: 'server/api/v1/prompts/[key].patch.ts',
  },
  {
    id: 'delete-prompt',
    method: 'DELETE',
    path: '/prompts/{key}',
    title: '删除 Prompt',
    kind: 'write',
    description: '删除 Prompt,它的版本历史和调用记录会一起删除,之后用这个 Key 调用返回 404。',
    params: [
      { name: 'key', in: 'path', type: 'string', required: true, description: 'Prompt 的 Key' },
    ],
    response: `{ "deleted": true, "key": "customer-analysis" }`,
    routeFile: 'server/api/v1/prompts/[key].delete.ts',
  },
  {
    id: 'save-version',
    method: 'POST',
    path: '/prompts/{key}/versions',
    title: '保存草稿与发布',
    kind: 'write',
    description:
      '最新版本还是草稿就原地更新,否则以最大版本号加 1 新建草稿;publish 为 true 时把当前草稿发布出去,原来的发布版本转为历史版本。只想发布已有草稿时只传 publish。',
    params: [
      { name: 'key', in: 'path', type: 'string', required: true, description: 'Prompt 的 Key' },
      { name: 'content', in: 'body', type: 'string', description: '新的正文,只发布时不传' },
      { name: 'variables', in: 'body', type: 'array', description: '变量定义,可省略' },
      { name: 'publish', in: 'body', type: 'boolean', description: '为 true 时发布' },
    ],
    request: `{ "content": "第二版正文 {{customer_info}}", "publish": false }`,
    response: `{ "key": "customer-analysis", "version": 2, "status": "draft" }`,
    routeFile: 'server/api/v1/prompts/[key]/versions.post.ts',
  },
  {
    id: 'create-category',
    method: 'POST',
    path: '/categories',
    title: '新建分类',
    kind: 'write',
    description: '在 Prompt 接口里也可以直接用 categoryName 引用分类,分类不存在时会被拒绝,所以需要时先建分类。重名返回 409。',
    params: [
      { name: 'name', in: 'body', type: 'string', required: true, description: '分类名称,最长 40 字' },
      { name: 'description', in: 'body', type: 'string', description: '分类说明,最长 200 字' },
    ],
    request: `{ "name": "客户", "description": "客户资料分析与跟进" }`,
    response: `{ "category": { "id": "5f1c9c3e-…", "name": "客户", "sortOrder": 0, "promptCount": 0 } }`,
    routeFile: 'server/api/v1/categories/index.post.ts',
  },
  {
    id: 'update-category',
    method: 'PATCH',
    path: '/categories/{id}',
    title: '修改分类',
    kind: 'write',
    description: '修改分类名称或说明,名称和其他分类重复时返回 409。',
    params: [
      { name: 'id', in: 'path', type: 'uuid', required: true, description: '分类 ID' },
      { name: 'name', in: 'body', type: 'string', description: '新的名称' },
      { name: 'description', in: 'body', type: 'string', description: '新的说明' },
    ],
    request: `{ "name": "重点客户" }`,
    response: `{ "category": { "id": "5f1c9c3e-…", "name": "重点客户", "promptCount": 12 } }`,
    routeFile: 'server/api/v1/categories/[id].patch.ts',
  },
  {
    id: 'delete-category',
    method: 'DELETE',
    path: '/categories/{id}',
    title: '删除分类',
    kind: 'write',
    description: '分类下还有 Prompt 时必须带 moveToCategoryId 指定迁移目标,否则返回 409,避免 Prompt 失去归属。',
    params: [
      { name: 'id', in: 'path', type: 'uuid', required: true, description: '分类 ID' },
      { name: 'moveToCategoryId', in: 'query', type: 'uuid', description: '把该分类下的 Prompt 迁移到的分类' },
    ],
    response: `{ "deleted": true, "movedPrompts": 12 }`,
    routeFile: 'server/api/v1/categories/[id].delete.ts',
  },
]

/** 给文档页和文档用的 curl 示例,baseUrl 替换成实际地址 */
export function curlExample(endpoint: ApiDocEndpoint, baseUrl: string): string {
  const lines = [`curl -X ${endpoint.method} "${baseUrl}${API_BASE_PATH}${endpoint.path}"`]
  lines.push(`  -H "Authorization: Bearer pk_live_xxxxx"`)
  if (endpoint.request) {
    lines.push(`  -H "content-type: application/json"`)
    lines.push(`  -d '${endpoint.request.replace(/\n\s*/g, ' ')}'`)
  }
  return lines.join(' \\\n')
}
