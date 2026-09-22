# 本机运行与验证

第一次跑这个项目,或者换一台机器时看这里。

## 环境变量

- 数据库连接信息放在仓库根目录的 `.env`,由 Nuxt 开发服务自动读取;命令行脚本用 `node --env-file=.env` 显式读取。
- `.env` 已经在 `.gitignore` 里,不要提交,也不要把里面的连接串贴到文档或聊天里。
- 主要变量是 `DATABASE_URL`(连接池连接)和 `DATABASE_URL_UNPOOLED`(直连,脚本里没有用到)。

## 常用命令

| 命令 | 作用 | 需要网络 |
|---|---|---|
| `pnpm install` | 安装依赖 | 是 |
| `pnpm db:migrate` | 执行 `db/migrations` 下未执行过的迁移 | 是(连数据库) |
| `pnpm db:seed` | 灌入演示账号和演示 Prompt,已存在则跳过 | 是(连数据库) |
| `pnpm dev` | 启动开发服务,默认 `http://localhost:3000` | 是(连数据库) |
| `pnpm typecheck` | 类型检查 | 否 |
| `pnpm test` | 单元测试 | 否 |
| `pnpm build` | 生产构建 | 否 |
| `pnpm smoke` | 端到端冒烟,需要先启动服务 | 是 |

## 演示数据

- 账号 `demo@example.com`,密码 `demo1234`,租户「个人空间」。
- `pnpm db:seed` 会顺便创建一把演示 API Key,完整 Key 只在输出里出现一次。
- 冒烟脚本会登录这个账号,自己创建分类、Prompt 和 API Key,跑完再删掉,不在库里留测试数据。

## 本机环境注意事项

- 这台机器上 Node 由 nvm 管理,`pnpm` 全局版本是 11,命令可以直接用,不需要 `npx`。
- 网络直连可以访问 npm registry 和 Neon;如果换成需要代理的环境,先配好 `HTTPS_PROXY` 再执行安装类命令。
- 端口被占用时用 `lsof -ti tcp:3000` 找到进程再决定是否结束它,不要直接 `kill -9` 整个 node 进程组。
