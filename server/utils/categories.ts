import type { Sql } from 'postgres'
import { businessError } from './errors'
import { assertText } from './validation'

interface CategoryRow {
  id: string
  name: string
  description: string
  sort_order: number
  prompt_count: string | number
}

export interface Category {
  id: string
  name: string
  description: string
  sortOrder: number
  promptCount: number
}

export function categorySummary(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sortOrder: Number(row.sort_order),
    promptCount: Number(row.prompt_count),
  }
}

export async function listCategories(db: Sql, tenantId: string): Promise<Category[]> {
  const rows = await db<CategoryRow[]>`
    select c.id, c.name, c.description, c.sort_order,
           (select count(*) from prompts p where p.category_id = c.id) as prompt_count
    from categories c
    where c.tenant_id = ${tenantId}
    order by c.sort_order, c.name
  `
  return rows.map(categorySummary)
}

export async function findCategory(
  db: Sql,
  tenantId: string,
  id: string,
): Promise<Category | null> {
  const [row] = await db<CategoryRow[]>`
    select c.id, c.name, c.description, c.sort_order,
           (select count(*) from prompts p where p.category_id = c.id) as prompt_count
    from categories c
    where c.tenant_id = ${tenantId} and c.id = ${id}
  `
  return row ? categorySummary(row) : null
}

export async function createCategory(
  db: Sql,
  tenantId: string,
  input: { name?: string, description?: string },
): Promise<Category> {
  const name = assertText(input.name, '分类名称', 40)
  const description = (input.description ?? '').trim().slice(0, 200)

  const [existing] = await db`
    select id from categories where tenant_id = ${tenantId} and name = ${name}
  `
  if (existing) {
    businessError('conflict', '分类名称已存在')
  }

  const [created] = await db<{ id: string }[]>`
    insert into categories (tenant_id, name, description, sort_order)
    values (
      ${tenantId}, ${name}, ${description},
      coalesce((select max(sort_order) + 1 from categories where tenant_id = ${tenantId}), 0)
    )
    returning id
  `
  if (!created) {
    businessError('internal_error', '创建分类失败')
  }
  const category = await findCategory(db, tenantId, created.id)
  if (!category) {
    businessError('internal_error', '创建分类失败')
  }
  return category
}

export async function updateCategory(
  db: Sql,
  tenantId: string,
  id: string,
  input: { name?: string, description?: string },
): Promise<Category> {
  const current = await findCategory(db, tenantId, id)
  if (!current) {
    businessError('not_found', '分类不存在')
  }

  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) {
    const name = assertText(input.name, '分类名称', 40)
    const [clash] = await db`
      select id from categories
      where tenant_id = ${tenantId} and name = ${name} and id <> ${id}
    `
    if (clash) {
      businessError('conflict', '分类名称已存在')
    }
    patch.name = name
  }
  if (input.description !== undefined) {
    patch.description = String(input.description).trim().slice(0, 200)
  }

  if (Object.keys(patch).length > 0) {
    await db`
      update categories set ${db(patch)} where id = ${id} and tenant_id = ${tenantId}
    `
  }

  const updated = await findCategory(db, tenantId, id)
  if (!updated) {
    businessError('internal_error', '更新分类失败')
  }
  return updated
}

/**
 * 删除分类。分类下还有 Prompt 时必须给出迁移目标,
 * 不允许因为删除分类让 Prompt 失去归属。
 */
export async function deleteCategory(
  db: Sql,
  tenantId: string,
  id: string,
  moveToCategoryId: string | null,
): Promise<{ movedPrompts: number }> {
  const current = await findCategory(db, tenantId, id)
  if (!current) {
    businessError('not_found', '分类不存在')
  }

  if (current.promptCount === 0) {
    await db`delete from categories where id = ${id} and tenant_id = ${tenantId}`
    return { movedPrompts: 0 }
  }

  if (!moveToCategoryId) {
    businessError(
      'conflict',
      `该分类下有 ${current.promptCount} 个 Prompt,请先指定要迁移到的分类`,
    )
  }
  const target = await findCategory(db, tenantId, moveToCategoryId)
  if (!target || target.id === id) {
    businessError('validation_failed', '迁移目标分类无效')
  }

  await db.begin(async (tx) => {
    await tx`
      update prompts set category_id = ${moveToCategoryId}, updated_at = now()
      where category_id = ${id} and tenant_id = ${tenantId}
    `
    await tx`delete from categories where id = ${id} and tenant_id = ${tenantId}`
  })
  return { movedPrompts: current.promptCount }
}
