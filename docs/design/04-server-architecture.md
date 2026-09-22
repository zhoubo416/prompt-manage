# 服务端结构

本篇描述代码目录怎么分、一个请求进来之后经过哪些环节、认证和租户隔离具体落在哪里。整体结构和数据表分别见 `00-system-design.md`、`01-data-model.md`。

## 目录职责

| 目录 | 放什么 | 不放什么 |
|---|---|---|
| `app/` | 页面、布局、组件、前端工具函数 | 数据库访问、业务规则 |
| `server/api/` | 管理接口(`/api/*`) | 页面渲染逻辑 |
| `server/api/v1/` | 对外 Prompt API | 管理后台用的接口 |
| `server/utils/` | 服务端公共能力:数据库连接、会话、密码、API Key、参数校验 | 具体业务用例的组装 |
| `shared/` | 前后端都要用的纯函数:变量识别与替换、输入规范化 | 任何引入数据库或请求上下文的代码 |
| `db/migrations/` | 建表和索引的 SQL,只增不改 | 演示数据 |
| `scripts/` | 迁移、种子数据、冒烟测试等运维脚本 | 应用运行时逻辑 |

`shared/` 里的东西必须是纯函数:同一份变量识别逻辑同时给编辑页预览和对外接口使用,两边口径才不会漂移。

## 一个管理请求的流程

```text
HTTP 请求 /api/prompts
    │
    ├── requireSession(event)     读 Cookie → 查 sessions → 拿到 accountId、tenantId、role
    ├── requireRole(event, 'admin')  需要更高权限的接口在这一步拦掉
    ├── 读取与校验请求体(server/utils/validation.ts)
    ├── useDb() 访问数据库,所有查询都带 tenant_id
    └── 返回 JSON
```

- 页面用 `useFetch` 调这些接口,服务端渲染阶段直接拿到数据。
- 未登录返回 401,权限不够返回 403,校验不通过返回 400,唯一约束冲突返回 409,资源不存在返回 404。
- 页面上的入口显隐只是体验,权限判断一律以服务端为准。

## 租户隔离落在哪里

- 管理接口的 `tenant_id` 只有一个来源:会话里记录的当前活跃租户,请求参数无法指定。
- 对外接口的 `tenant_id` 只有一个来源:API Key 记录本身。
- 每个 SQL 查询都显式写 `tenant_id = ...` 条件,包括按主键查单条记录的语句;不提供"先按 ID 查出来再判断归属"的写法,避免漏判。
- 分类、Prompt、API Key、Usage 的写入同样带 `tenant_id`,不依赖前端传来的归属信息。

## 版本写入规则

保存和发布都走 `server/api/prompts/[id]/versions.post.ts`,在一个事务里完成:

1. `select ... for update` 锁住这条 Prompt,避免并发保存出现两个草稿。
2. 有正文就保存:最新版本还是草稿就原地更新,否则以 `最大版本号 + 1` 新建草稿。
3. 需要发布时,先把原来的 `published` 改成 `archived`,再把目标版本改成 `published`,同时更新 `prompts.current_version`。

数据库上的部分唯一索引 `prompt_versions_one_published` 保证一个 Prompt 同时最多一个发布版本,即使业务代码写错也会被拦住。

## 数据库访问

- 全进程共用一个连接池(`server/utils/db.ts`),连接串来自 `DATABASE_URL`,需要 SSL。
- 写 `jsonb` 列统一用 `server/utils/json.ts` 的 `toJson`:自己 `JSON.stringify` 再传字符串,会被驱动当成 JSON 字符串再编码一次,存进去就变成带引号的字符串。
- 路径参数统一用 `requireParam` 取,拿到的一定是字符串;请求体字段由 `server/utils/validation.ts` 里的 `assert*` 校验。
- 迁移按文件名顺序执行,执行记录写在 `schema_migrations`,已执行过的文件不重复跑,因此迁移文件只增不改。

## 修改历史

- 2026-09-22 首次创建,记录第一版的目录划分、请求流程、租户隔离和版本写入规则。
