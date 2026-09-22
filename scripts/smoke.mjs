/**
 * 端到端冒烟:对着已经跑起来的服务走一遍真实业务流程。
 * 用法:先 pnpm dev,再 node --env-file=.env scripts/smoke.mjs [baseUrl]
 */
const baseUrl = process.argv[2] ?? process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000'
const runId = Date.now().toString(36)
let cookie = ''

function assert(condition, message) {
  if (!condition) {
    throw new Error(`断言失败:${message}`)
  }
  console.log(`  ✓ ${message}`)
}

async function call(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(cookie && !options.anonymous ? { cookie } : {}),
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const setCookie = response.headers.getSetCookie?.() ?? []
  if (setCookie.length > 0) {
    cookie = setCookie.map(item => item.split(';')[0]).join('; ')
  }
  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { status: response.status, data }
}

async function main() {
  console.log(`冒烟目标:${baseUrl}`)

  console.log('1. 登录演示账号')
  const login = await call('/api/auth/login', {
    method: 'POST',
    body: { email: 'demo@example.com', password: 'demo1234' },
  })
  assert(login.status === 200, `登录成功(${login.status})`)

  const session = await call('/api/auth/session')
  assert(session.data?.authenticated === true, '会话有效')
  assert(!!session.data?.tenant?.id, '会话带上了租户')

  console.log('2. 准备分类')
  const categoryName = `冒烟分类 ${runId}`
  const category = await call('/api/categories', {
    method: 'POST',
    body: { name: categoryName, description: '由冒烟脚本创建' },
  })
  assert(category.status === 200 && !!category.data?.id, '创建分类')
  const categoryId = category.data.id

  console.log('3. 创建并发布 Prompt')
  const promptKey = `smoke-${runId}`
  const created = await call('/api/prompts', {
    method: 'POST',
    body: {
      name: '冒烟 Prompt',
      key: promptKey,
      categoryId,
      description: '冒烟测试用',
      content: '你是一个助手,请分析 {{customer_info}}',
      publish: true,
    },
  })
  assert(created.status === 200 && !!created.data?.id, '创建 Prompt 并发布 v1')
  const promptId = created.data.id

  const detail = await call(`/api/prompts/${promptId}`)
  assert(detail.data?.prompt?.currentVersion === 1, '当前版本是 v1')
  assert(detail.data?.versions?.[0]?.variables?.[0]?.name === 'customer_info', '识别出变量 customer_info')

  const duplicated = await call('/api/prompts', {
    method: 'POST',
    body: { name: '重复 Key', key: promptKey, categoryId, content: 'x' },
  })
  assert(duplicated.status === 409, '同一个租户下 Key 重复被拒绝')

  console.log('4. 创建 API Key 并调用对外接口')
  const issued = await call('/api/api-keys', { method: 'POST', body: { name: `冒烟 Key ${runId}` } })
  assert(issued.status === 200 && issued.data?.key?.startsWith('pk_live_'), '创建 API Key')
  const apiKey = issued.data.key
  const apiKeyId = issued.data.id

  const list = await call('/api/api-keys')
  const listed = list.data?.apiKeys?.find(item => item.id === apiKeyId)
  assert(!!listed?.keyPrefix && !listed.key, '列表只返回前缀,不返回完整 Key')

  const unauthorized = await call('/api/v1/prompts/' + promptKey)
  assert(unauthorized.status === 401, '缺少 API Key 返回 401')

  const first = await call(`/api/v1/prompts/${promptKey}`, { headers: { authorization: `Bearer ${apiKey}` } })
  assert(first.status === 200 && first.data?.version === 1, '对外接口返回 v1')
  assert(first.data?.template?.includes('{{customer_info}}'), '返回的正文保留变量占位')

  console.log('5. 版本管理')
  const saved = await call(`/api/prompts/${promptId}/versions`, {
    method: 'POST',
    body: { content: '第二版:请分析 {{customer_info}},并给出建议', publish: false },
  })
  assert(saved.data?.version === 2 && saved.data?.published === false, '保存生成草稿 v2')

  const stillFirst = await call(`/api/v1/prompts/${promptKey}`, { headers: { authorization: `Bearer ${apiKey}` } })
  assert(stillFirst.data?.version === 1, '草稿不影响对外提供的版本')

  const published = await call(`/api/prompts/${promptId}/versions`, {
    method: 'POST',
    body: { publish: true },
  })
  assert(published.data?.version === 2 && published.data?.published === true, '发布 v2')

  const second = await call(`/api/v1/prompts/${promptKey}`, { headers: { authorization: `Bearer ${apiKey}` } })
  assert(second.data?.version === 2, '对外接口改为返回 v2')

  const fixed = await call(`/api/v1/prompts/${promptKey}/versions/1`, { headers: { authorization: `Bearer ${apiKey}` } })
  assert(fixed.status === 200 && fixed.data?.version === 1, '按版本号仍能取到 v1')

  const history = await call(`/api/prompts/${promptId}`)
  const v1 = history.data?.versions?.find(item => item.version === 1)
  assert(v1?.status === 'archived', 'v1 转为 archived')

  console.log('6. 统计')
  const summary = await call('/api/analytics/summary?range=today')
  assert(summary.data?.totals?.today >= 4, `今日调用数已累加(${summary.data?.totals?.today})`)
  const ranked = summary.data?.ranking?.find(item => item.id === promptId)
  assert(!!ranked && ranked.count >= 4, `排行里能找到这个 Prompt(${ranked?.count})`)

  console.log('7. 分类删除要先迁移')
  const blocked = await call(`/api/categories/${categoryId}`, { method: 'DELETE', body: { moveToCategoryId: null } })
  assert(blocked.status === 409, '分类下有 Prompt 时不允许直接删除')

  const otherCategoryId = (await call('/api/categories')).data.categories.find(item => item.id !== categoryId)?.id
  const moved = await call(`/api/categories/${categoryId}`, {
    method: 'DELETE',
    body: { moveToCategoryId: otherCategoryId },
  })
  assert(moved.status === 200 && moved.data?.movedPrompts === 1, '迁移到其他分类后删除成功')

  const afterMove = await call(`/api/prompts/${promptId}`)
  assert(afterMove.data?.prompt?.categoryId === otherCategoryId, 'Prompt 归属已经跟着迁移')

  console.log('8. 对外接口的权限')
  const readKeyResponse = await call('/api/api-keys', { method: 'POST', body: { name: `冒烟只读 Key ${runId}` } })
  assert(readKeyResponse.data?.access === 'read', '不传权限时创建的 Key 是只读')
  const readKey = readKeyResponse.data.key

  const writeKeyResponse = await call('/api/api-keys', {
    method: 'POST',
    body: { name: `冒烟读写 Key ${runId}`, access: 'write' },
  })
  assert(writeKeyResponse.data?.access === 'write', '可以创建读写 Key')
  const writeKey = writeKeyResponse.data.key

  const anonymous = await call('/api/v1/prompts')
  assert(anonymous.status === 401 && anonymous.data?.error?.code === 'unauthorized', '没有 Key 时返回 unauthorized')

  const externalList = await call('/api/v1/prompts?limit=5', { headers: { authorization: `Bearer ${readKey}` }, anonymous: true })
  assert(externalList.status === 200 && externalList.data?.total >= 1, '只读 Key 可以列出 Prompt')
  assert(externalList.data?.prompts?.length <= 5, 'limit 生效')

  const forbidden = await call('/api/v1/prompts', {
    method: 'POST',
    anonymous: true,
    headers: { authorization: `Bearer ${readKey}` },
    body: { name: '越权创建', key: `denied-${runId}`, content: 'x' },
  })
  assert(forbidden.status === 403 && forbidden.data?.error?.code === 'forbidden', '只读 Key 调维护接口返回 forbidden')

  console.log('9. 对外维护接口')
  const externalCategory = await call('/api/v1/categories', {
    method: 'POST',
    anonymous: true,
    headers: { authorization: `Bearer ${writeKey}` },
    body: { name: `三方分类 ${runId}`, description: '由冒烟脚本通过对外接口创建' },
  })
  assert(externalCategory.status === 200 && !!externalCategory.data?.category?.id, '通过接口新建分类')
  const externalCategoryId = externalCategory.data.category.id

  const externalKey = `external-${runId}`
  const externalCreated = await call('/api/v1/prompts', {
    method: 'POST',
    anonymous: true,
    headers: { authorization: `Bearer ${writeKey}` },
    body: {
      name: '三方创建的 Prompt',
      key: externalKey,
      categoryId: externalCategoryId,
      content: '请分析 {{customer_info}}',
      publish: false,
    },
  })
  assert(externalCreated.status === 200 && externalCreated.data?.status === 'draft', '通过接口创建草稿 Prompt')
  assert(
    externalCreated.data?.prompt?.categoryId === externalCategoryId
      && externalCreated.data?.prompt?.currentVersion === null,
    '创建响应返回 Prompt 摘要,草稿还没有当前版本',
  )

  const duplicatedExternal = await call('/api/v1/prompts', {
    method: 'POST',
    anonymous: true,
    headers: { authorization: `Bearer ${writeKey}` },
    body: { name: '重复', key: externalKey, categoryName: `三方分类 ${runId}`, content: 'x' },
  })
  assert(duplicatedExternal.status === 409 && duplicatedExternal.data?.error?.code === 'conflict', 'Key 重复返回 conflict')

  const savedExternal = await call(`/api/v1/prompts/${externalKey}/versions`, {
    method: 'POST',
    anonymous: true,
    headers: { authorization: `Bearer ${writeKey}` },
    body: { content: '第二版:分析 {{customer_info}} 并给出建议' },
  })
  assert(savedExternal.data?.version === 1 && savedExternal.data?.status === 'draft', '草稿版本原地更新')

  const publishedExternal = await call(`/api/v1/prompts/${externalKey}/versions`, {
    method: 'POST',
    anonymous: true,
    headers: { authorization: `Bearer ${writeKey}` },
    body: { publish: true },
  })
  assert(publishedExternal.data?.status === 'published', '通过接口发布草稿')

  const fetchedExternal = await call(`/api/v1/prompts/${externalKey}`, {
    anonymous: true,
    headers: { authorization: `Bearer ${readKey}` },
  })
  assert(fetchedExternal.status === 200 && fetchedExternal.data?.version === 1, '只读 Key 能取到三方创建的版本')

  const externalHistory = await call(`/api/v1/prompts/${externalKey}/versions`, {
    anonymous: true,
    headers: { authorization: `Bearer ${writeKey}` },
  })
  assert(externalHistory.data?.versions?.[0]?.status === 'published', '版本历史返回发布状态')
  assert(externalHistory.data?.versions?.[0]?.variables?.[0]?.name === 'customer_info', '版本历史带上变量定义')

  const renamed = await call(`/api/v1/prompts/${externalKey}`, {
    method: 'PATCH',
    anonymous: true,
    headers: { authorization: `Bearer ${writeKey}` },
    body: { name: '三方改过名字的 Prompt' },
  })
  assert(renamed.data?.prompt?.name === '三方改过名字的 Prompt', '通过接口改名称')

  const blockedDelete = await call(`/api/v1/categories/${externalCategoryId}`, {
    method: 'DELETE',
    anonymous: true,
    headers: { authorization: `Bearer ${writeKey}` },
  })
  assert(blockedDelete.status === 409 && blockedDelete.data?.error?.code === 'conflict', '分类下有 Prompt 时删除返回 conflict')

  const migrated = await call(
    `/api/v1/categories/${externalCategoryId}?moveToCategoryId=${otherCategoryId}`,
    { method: 'DELETE', anonymous: true, headers: { authorization: `Bearer ${writeKey}` } },
  )
  assert(migrated.status === 200 && migrated.data?.movedPrompts === 1, '带迁移目标时删除分类成功')

  const deletedExternal = await call(`/api/v1/prompts/${externalKey}`, {
    method: 'DELETE',
    anonymous: true,
    headers: { authorization: `Bearer ${writeKey}` },
  })
  assert(deletedExternal.data?.deleted === true, '通过接口删除 Prompt')

  const goneExternal = await call(`/api/v1/prompts/${externalKey}`, {
    anonymous: true,
    headers: { authorization: `Bearer ${writeKey}` },
  })
  assert(goneExternal.status === 404 && goneExternal.data?.error?.code === 'not_found', '删除后返回 not_found')

  console.log('10. 公共接口文档页')
  const docs = await call('/docs', { anonymous: true })
  assert(docs.status === 200, '未登录可以打开 /docs')
  assert(
    typeof docs.data === 'string'
      && docs.data.includes('维护接口')
      && docs.data.includes('Authorization: Bearer'),
    '文档页列出了接口清单和认证说明',
  )

  console.log('11. 清理')
  assert((await call(`/api/api-keys/${readKeyResponse.data.id}`, { method: 'DELETE' })).status === 200, '删除只读 Key')
  assert((await call(`/api/api-keys/${writeKeyResponse.data.id}`, { method: 'DELETE' })).status === 200, '删除读写 Key')
  const disabled = await call(`/api/api-keys/${apiKeyId}`, { method: 'PATCH', body: { status: 'disabled' } })
  assert(disabled.status === 200, '禁用 API Key')
  const rejected = await call(`/api/v1/prompts/${promptKey}`, { headers: { authorization: `Bearer ${apiKey}` } })
  assert(rejected.status === 401, '禁用后调用被拒绝')

  assert((await call(`/api/prompts/${promptId}`, { method: 'DELETE' })).status === 200, '删除 Prompt')
  assert((await call(`/api/api-keys/${apiKeyId}`, { method: 'DELETE' })).status === 200, '删除 API Key')

  const gone = await call(`/api/prompts/${promptId}`)
  assert(gone.status === 404, '删除后查不到该 Prompt')

  console.log('\n冒烟通过')
}

main().catch((error) => {
  console.error(`\n冒烟失败:${error.message}`)
  process.exitCode = 1
})
