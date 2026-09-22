# Prompt 对外 API

本篇是 `/api/v1` 的契约来源,描述认证方式、权限范围、查询与维护接口、错误约定和统计口径。公开页面 `/docs` 展示的内容来自同一份接口清单 `shared/api-catalog.ts`,并且有测试保证清单和 `server/api/v1` 下的实现一一对应,不会各写一套。数据结构和整体结构见 `01-data-model.md`、`00-system-design.md`。

## 认证与权限

业务系统在请求头里带上 API Key:

```http
Authorization: Bearer pk_live_xxxxx
```

服务端先按 Key 的 SHA-256 值定位记录,再判断状态和权限:

- `tenant_id` 完全由 Key 记录决定,请求参数不能指定租户。
- Key 的状态是 `disabled` 或记录已删除,返回 401。
- Key 的 `access` 是 `read` 时只能调用查询接口,调用维护接口返回 403。
- `access` 是 `write` 时查询和维护接口都可以调用。

创建 Key 时选择权限,默认只读。已经发出去的 Key 不会因为这次改动自动获得写权限。

## 字段与命名约定

- 请求和响应都是 JSON,字段用 camelCase。
- Prompt 在 URL 里用它的 `key` 定位,分类用 `id` 定位。
- 时间字段用 ISO 8601 字符串。
- 列表接口用 `limit`(默认 50,最大 200)和 `offset`(默认 0)分页,响应里带 `total`。

## 查询接口

### 列出 Prompt

```http
GET /api/v1/prompts?categoryId=<uuid>&search=客户&limit=50&offset=0
```

`search` 同时匹配名称和 Key。`categoryId` 和 `categoryName` 二选一即可,同时传时以 `categoryId` 为准。

```json
{
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
}
```

### 取最新发布版本

```http
GET /api/v1/prompts/{key}
```

```json
{
  "key": "customer-analysis",
  "name": "客户信息分析",
  "version": 3,
  "template": "你是一名专业的客户分析助手……",
  "variables": [
    { "name": "customer_info", "type": "text", "required": true }
  ]
}
```

没有发布版本的 Prompt 返回 404,不会返回草稿内容。

### 版本历史

```http
GET /api/v1/prompts/{key}/versions
```

```json
{
  "key": "customer-analysis",
  "versions": [
    { "version": 3, "status": "published", "createdAt": "2026-09-20T02:11:00.000Z",
      "variables": [{ "name": "customer_info", "type": "text", "required": true }] }
  ]
}
```

只返回版本元信息,正文通过指定版本接口按需取,避免一次拉回大量内容。

### 取指定版本

```http
GET /api/v1/prompts/{key}/versions/{version}
```

返回结构与「取最新发布版本」一致。已归档的历史版本可以取到,草稿取不到,用于需要固定 Prompt 版本的业务。

### 列出分类

```http
GET /api/v1/categories
```

```json
{
  "categories": [
    { "id": "5f1c9c3e-…", "name": "客户", "description": "客户资料分析与跟进",
      "sortOrder": 0, "promptCount": 12 }
  ]
}
```

## 维护接口

维护接口让第三方系统直接管理 Prompt,不需要人登录后台,写入规则和校验与管理后台完全一致。

### 新建 Prompt

```http
POST /api/v1/prompts
```

```json
{
  "name": "客户信息分析",
  "key": "customer-analysis",
  "categoryName": "客户",
  "description": "分析客户资料,提取客户需求和潜在风险",
  "content": "你是一名专业的客户分析助手。\n\n请分析以下客户信息:\n\n{{customer_info}}",
  "variables": [{ "name": "customer_info", "required": true, "description": "客户背景资料" }],
  "publish": true
}
```

`variables` 可以省略,服务端会从正文里识别 `{{占位符}}` 并补默认值,正文里没有的变量会被丢弃。`publish` 省略或为 `false` 时创建的是草稿。同一个租户下 `key` 重复返回 409。

```json
{
  "prompt": {
    "key": "customer-analysis", "name": "客户信息分析", "description": "...",
    "categoryId": "5f1c9c3e-…", "categoryName": "客户", "currentVersion": 1,
    "versionCount": 1, "hasDraft": false, "usageCount": 0,
    "createdAt": "2026-09-22T06:00:00.000Z", "updatedAt": "2026-09-22T06:00:00.000Z"
  },
  "version": 1,
  "status": "published"
}
```

### 修改 Prompt

```http
PATCH /api/v1/prompts/{key}
```

```json
{ "name": "客户信息分析", "description": "新的描述", "categoryId": "5f1c9c3e-…" }
```

只改元信息,正文走保存版本接口。为了不打断已经接入的调用方,Key 不能通过接口修改,确实需要改时在后台里改。响应返回更新后的 Prompt 摘要。

### 删除 Prompt

```http
DELETE /api/v1/prompts/{key}
```

```json
{ "deleted": true, "key": "customer-analysis" }
```

版本历史和调用记录会跟着删除,删掉的 Key 之后调用返回 404。

### 保存草稿与发布

```http
POST /api/v1/prompts/{key}/versions
```

```json
{ "content": "第二版正文 {{customer_info}}", "publish": false }
```

规则和后台一致:最新版本还是草稿就原地更新,否则以最大版本号加 1 新建草稿;`publish` 为 `true` 时把当前草稿发布出去,原来的发布版本转为历史版本。只想发布已有草稿时只传 `publish: true`,不用重复提交正文。

```json
{ "key": "customer-analysis", "version": 2, "status": "draft" }
```

### 分类维护

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/v1/categories` | 新建分类,重名返回 409 |
| PATCH | `/api/v1/categories/{id}` | 改名称或说明 |
| DELETE | `/api/v1/categories/{id}?moveToCategoryId=<uuid>` | 删除分类,分类下有 Prompt 时必须带迁移目标,否则返回 409 |

删除分类的响应:`{ "deleted": true, "movedPrompts": 12 }`。

## 不对外提供的接口

API Key 管理、成员管理和租户设置只在管理后台里操作,不对第三方开放,避免把扩大攻击面的能力发出去。

## 调用统计口径

- 只有「取最新发布版本」和「取指定版本」在成功返回时计一次调用,并刷新 Key 的最后使用时间。
- 列表、版本历史和全部维护接口都不写 Usage,避免把三方的同步流量算成 Prompt 使用量。
- 统计数字来自 `prompt_usage`,页面按 Asia/Shanghai 的今日、本周、本月、全部聚合。

## 错误约定

响应体在 Nitro 默认的 `statusCode`、`statusMessage` 之外,追加一个稳定的 `error` 对象,便于三方按 code 分支处理:

```json
{ "statusCode": 403, "statusMessage": "当前 API Key 只有查询权限",
  "error": { "code": "forbidden", "message": "当前 API Key 只有查询权限" } }
```

| code | 状态码 | 出现的场景 |
|---|---|---|
| `unauthorized` | 401 | 缺少 API Key、Key 无效或已禁用 |
| `forbidden` | 403 | 只读 Key 调用维护接口 |
| `validation_failed` | 400 | 请求体字段不合法、版本号不是正整数、分类不存在 |
| `not_found` | 404 | Prompt、版本或分类不存在,或没有可用的发布版本 |
| `conflict` | 409 | Key 重复、分类重名、分类下还有 Prompt |
| `internal_error` | 500 | 服务端未预期的错误 |

对外不泄露草稿内容、内部 ID 和其他租户的信息。

## 公共文档页

`/docs` 是不需要登录的公共页面,给三方查看接口能力:认证方式、权限说明、每个接口的参数与请求响应示例、错误码,以及可以直接复制的 curl 示例。

- 页面内容来自 `shared/api-catalog.ts`,和本文档、实现保持一致;测试会检查清单里的每个接口都有对应实现文件,且 `server/api/v1` 下没有漏登记的接口。
- 页面上不展示任何租户数据,也不会出现完整的 API Key。
- 第一版不做在线调试,不需要用户把 Key 输进页面。

## 修改历史

- 2026-09-22 开放维护接口:API Key 增加 read / write 权限、补齐查询与维护接口、约定统一的响应字段和 `error.code`、新增公共文档页 `/docs`。
- 2026-09-22 实现落地:补上各错误情况对应的状态码和是否计入调用,确认按版本号可以取到已经归档的历史版本。
- 2026-09-22 首次创建,记录第一版的对外接口、认证流程和统计口径。
