// 灌入一份演示数据:一个账号、一个租户、五个分类和几条 Prompt
import { connect, generateApiKey, hashPassword, sha256 } from './db.mjs'

const DEMO_EMAIL = 'demo@example.com'
const DEMO_PASSWORD = 'demo1234'

const categories = [
  { name: '客户', description: '客户资料分析与跟进' },
  { name: '会议', description: '会议记录与总结' },
  { name: '内容', description: '内容创作与改写' },
  { name: '编程', description: '代码相关任务' },
  { name: '其他', description: '未归类的 Prompt' },
]

const prompts = [
  {
    name: '客户信息分析',
    key: 'customer-analysis',
    category: '客户',
    description: '分析客户资料,提取客户需求和潜在风险',
    content: [
      '你是一名专业的客户分析助手。',
      '',
      '请分析以下客户信息:',
      '',
      '{{customer_info}}',
      '',
      '请输出:',
      '1. 客户核心需求',
      '2. 潜在风险',
      '3. 下一步建议',
    ].join('\n'),
    variables: [
      { name: 'customer_info', type: 'text', required: true, description: '客户背景资料' },
    ],
    published: true,
  },
  {
    name: '客户信息总结',
    key: 'customer-summary',
    category: '客户',
    description: '把零散的客户沟通记录整理成结构化总结',
    content: '请把下面的客户沟通记录整理成要点清晰的总结:\n\n{{notes}}',
    variables: [{ name: 'notes', type: 'text', required: true, description: '沟通记录原文' }],
    published: true,
  },
  {
    name: '会议总结',
    key: 'meeting-summary',
    category: '会议',
    description: '从会议记录中提取结论、待办和负责人',
    content: '请阅读下面的会议记录,输出结论、待办事项和负责人:\n\n{{transcript}}',
    variables: [{ name: 'transcript', type: 'text', required: true, description: '会议记录' }],
    published: true,
  },
  {
    name: '文章改写',
    key: 'article-rewrite',
    category: '内容',
    description: '在不改变原意的前提下改写文章,调整语气和节奏',
    content: '请改写下面这段文字,保持原意,语气调整为{{tone}}:\n\n{{article}}',
    variables: [
      { name: 'tone', type: 'text', required: true, description: '目标语气' },
      { name: 'article', type: 'text', required: true, description: '原文' },
    ],
    published: true,
  },
  {
    name: '代码审查',
    key: 'code-review',
    category: '编程',
    description: '审查代码改动,指出缺陷和风险',
    content: '请审查下面的代码改动,指出缺陷、风险和改进建议:\n\n{{diff}}',
    variables: [{ name: 'diff', type: 'text', required: true, description: '代码 diff' }],
    published: false,
  },
]

const sql = connect()

try {
  const existing = await sql`select id from accounts where email = ${DEMO_EMAIL}`
  if (existing.length > 0) {
    console.log(`账号 ${DEMO_EMAIL} 已存在,跳过种子数据`)
  } else {
    await sql.begin(async tx => {
      const passwordHash = await hashPassword(DEMO_PASSWORD)
      const [account] = await tx`
        insert into accounts (email, password_hash) values (${DEMO_EMAIL}, ${passwordHash})
        returning id
      `
      const [tenant] = await tx`
        insert into tenants (name) values ('个人空间') returning id
      `
      const [user] = await tx`
        insert into users (account_id, tenant_id, email, role)
        values (${account.id}, ${tenant.id}, ${DEMO_EMAIL}, 'owner')
        returning id
      `

      const categoryIds = new Map()
      for (const [index, category] of categories.entries()) {
        const [row] = await tx`
          insert into categories (tenant_id, name, description, sort_order)
          values (${tenant.id}, ${category.name}, ${category.description}, ${index})
          returning id
        `
        categoryIds.set(category.name, row.id)
      }

      for (const prompt of prompts) {
        const [row] = await tx`
          insert into prompts (tenant_id, category_id, name, key, description, created_by)
          values (${tenant.id}, ${categoryIds.get(prompt.category)}, ${prompt.name}, ${prompt.key},
                  ${prompt.description}, ${user.id})
          returning id
        `
        await tx`
          insert into prompt_versions (prompt_id, version, content, variables, status, created_by)
          values (${row.id}, 1, ${prompt.content}, ${tx.json(prompt.variables)},
                  ${prompt.published ? 'published' : 'draft'}, ${user.id})
        `
        if (prompt.published) {
          await tx`update prompts set current_version = 1 where id = ${row.id}`
        }
      }

      const issued = generateApiKey()
      await tx`
        insert into api_keys (tenant_id, name, key_prefix, key_hash)
        values (${tenant.id}, 'Production', ${issued.prefix}, ${issued.hash})
      `
      console.log(`演示 API Key(只显示这一次):${issued.key}`)
      console.log(`其中 key_prefix=${issued.prefix}, key_hash=${sha256(issued.key).slice(0, 12)}…`)
    })
    console.log(`种子数据完成:${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
  }
} catch (error) {
  console.error('种子数据失败:', error.message)
  process.exitCode = 1
} finally {
  await sql.end()
}
