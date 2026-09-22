// 按文件名顺序执行 db/migrations 下未执行过的迁移,执行记录写在 schema_migrations
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL

if (!url) {
  console.error('缺少 DATABASE_URL,请确认 .env 存在')
  process.exit(1)
}

const sql = postgres(url, { ssl: 'require', max: 1 })

try {
  await sql`
    create table if not exists schema_migrations (
      name       text primary key,
      applied_at timestamptz not null default now()
    )
  `

  const dir = join(root, 'db', 'migrations')
  const files = (await readdir(dir)).filter(name => name.endsWith('.sql')).sort()
  const rows = await sql`select name from schema_migrations`
  const applied = new Set(rows.map(row => row.name))

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`跳过 ${file}(已执行)`)
      continue
    }
    const content = await readFile(join(dir, file), 'utf8')
    await sql.begin(async tx => {
      await tx.unsafe(content)
      await tx`insert into schema_migrations (name) values (${file})`
    })
    console.log(`执行 ${file}`)
  }

  console.log('迁移完成')
} catch (error) {
  console.error('迁移失败:', error.message)
  process.exitCode = 1
} finally {
  await sql.end()
}
