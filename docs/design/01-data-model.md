# 数据模型

本篇描述第一版需要的数据表、字段职责、关系和约束,是数据结构的唯一设计来源。字段类型以最终选定的数据库和技术栈为准,本篇只约定含义、约束和归属。整体结构见 `00-system-design.md`。

## 表清单

| 表 | 职责 |
|---|---|
| `accounts` | 登录身份:邮箱与密码哈希 |
| `tenants` | 数据隔离单位 |
| `users` | 成员关系:一个账号在一个 Tenant 中的角色 |
| `sessions` | 登录会话与当前活跃 Tenant |
| `categories` | Tenant 内的一级分类 |
| `prompts` | Prompt 的元信息与当前版本引用 |
| `prompt_versions` | Prompt 正文、变量与版本状态 |
| `api_keys` | 对外调用凭证 |
| `prompt_usage` | 每次成功调用的记录 |

## accounts

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `email` | 登录邮箱,全局唯一 |
| `password_hash` | `scrypt$盐$哈希` 格式的密码摘要 |
| `created_at` | 创建时间 |

登录身份和租户成员拆开,是因为同一个邮箱可能同时属于多个租户。使用外部认证服务时,这里的 `id` 换成认证侧的用户 ID 即可。

## tenants

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `name` | Tenant 名称,例如"个人空间""公司空间" |
| `created_at` | 创建时间 |

## users

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `account_id` | 所属账号,指向 `accounts` |
| `tenant_id` | 所属 Tenant |
| `email` | 冗余的登录邮箱,方便按成员排查问题 |
| `role` | `owner` / `admin` / `member` |
| `created_at` | 创建时间 |

约束:`(account_id, tenant_id)` 唯一,即一个账号在一个租户下只能有一条成员记录。一个账号可以属于多个 Tenant,每个 Tenant 各有一条记录。

## sessions

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `token_hash` | 会话令牌的 SHA-256 值,唯一 |
| `account_id` | 所属账号 |
| `tenant_id` | 当前活跃的 Tenant,切换租户时改这里 |
| `expires_at` | 过期时间,默认创建后 30 天 |
| `created_at` | 创建时间 |

数据库里不保存会话令牌明文,只保存哈希;Cookie 里放的是明文令牌,并且是 HttpOnly。切换租户只更新这条记录的 `tenant_id`,不重新登录。

## categories

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `tenant_id` | 所属 Tenant |
| `name` | 分类名,例如"客户""会议" |
| `description` | 分类说明,可空 |
| `sort_order` | 列表排序依据 |
| `created_at` | 创建时间 |

分类只支持一级,没有父子关系。删除分类时必须先把其下的 Prompt 迁移到其他分类,不允许因删除分类而让 Prompt 失去归属。

## prompts

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `tenant_id` | 所属 Tenant |
| `category_id` | 所属分类 |
| `name` | 展示名称,可以修改 |
| `key` | API 调用用的 Key,同 Tenant 内唯一,创建后不建议修改 |
| `description` | 描述 |
| `current_version` | 当前 Published 版本号,列表和详情展示用 |
| `created_by` | 创建者 |
| `created_at` / `updated_at` | 创建与更新时间 |

约束:`(tenant_id, key)` 唯一。改 Key 会打断已接入的业务系统,因此只在用户明确要求时修改。

## prompt_versions

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `prompt_id` | 所属 Prompt |
| `version` | 版本号,从 1 开始递增 |
| `content` | Prompt 正文,变量用 `{{name}}` 占位 |
| `variables` | 变量定义,至少包含 `name`、`type`、`required`、`description` |
| `status` | `draft` / `published` / `archived` |
| `created_by` | 创建者 |
| `created_at` | 创建时间 |

约束:`(prompt_id, version)` 唯一,版本号只增不复用,历史版本的内容不被覆盖。同一个 Prompt 同时最多只有一个 `published` 版本。

## api_keys

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `tenant_id` | 所属 Tenant,决定该 Key 能访问哪些数据 |
| `name` | 便于识别的名称,例如 Production |
| `key_prefix` | Key 前缀,用于识别和排查,例如 `pk_live_8f3a` |
| `key_hash` | Key 的哈希值,校验时使用 |
| `access` | `read` 只能查询,`write` 还能调用维护接口;默认 `read` |
| `status` | `active` / `disabled` |
| `last_used_at` | 最后使用时间 |
| `created_at` | 创建时间 |

不保存完整 Key 明文,完整 Key 只在创建成功后展示一次。删除 Key 之后,使用该 Key 的请求立即失效。`access` 默认是 `read`,新建 Key 时才需要显式选择写权限,存量 Key 不会因为新增维护接口自动变得可写。

## prompt_usage

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `tenant_id` | 所属 Tenant |
| `prompt_id` | 被调用的 Prompt |
| `prompt_version` | 返回的版本号 |
| `api_key_id` | 使用的 API Key |
| `status` | 调用结果,成功返回 Prompt 记为 `success` |
| `latency` | 响应耗时 |
| `created_at` | 调用时间 |

这张表同时用于"Prompt 调用次数"和统计页面的时间范围聚合,写入发生在 Prompt API 返回之前,保证调用成功即被记录。

## 关系总览

```text
tenants
  ├── users ── accounts
  ├── sessions ── accounts
  ├── categories ──┐
  ├── api_keys     │
  └── prompts ←────┘
        ├── prompt_versions
        └── prompt_usage
```

## 修改历史

- 2026-09-22 `api_keys` 增加 `access` 字段,区分只读和读写,默认只读。
- 2026-09-22 补充 `accounts`、`sessions` 两张表,把 `users` 的职责收窄成成员关系,记录 `(account_id, tenant_id)` 唯一约束。
- 2026-09-22 首次创建,记录第一版的数据表、字段职责和约束。
