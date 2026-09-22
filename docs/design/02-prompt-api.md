# Prompt 对外 API

本篇描述业务系统获取 Prompt 的接口、认证流程、返回字段和调用统计口径。数据结构和整体结构分别见 `01-data-model.md`、`00-system-design.md`。

## 认证方式

业务系统在请求头里带上 API Key:

```http
Authorization: Bearer pk_live_xxxxx
```

服务端先用 `key_prefix` 定位候选记录,再用 `key_hash` 校验完整性。校验通过后,`tenant_id` 完全由这条 Key 记录决定,请求参数不能指定 Tenant。Key 已禁用或已删除时返回认证失败,并且不写 Usage 记录。

## 接口

### 获取最新发布版本

```http
GET /api/v1/prompts/{key}
Authorization: Bearer pk_live_xxxxx
```

返回该 Key 对应 Tenant 下 `{key}` 的最新 Published 版本。没有 Published 版本时按"不可用"处理,不返回草稿内容。

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

### 获取指定版本

```http
GET /api/v1/prompts/{key}/versions/{version}
Authorization: Bearer pk_live_xxxxx
```

返回指定版本,供需要固定 Prompt 版本的业务使用。返回结构与上一个接口一致,只是 `version` 为请求的版本号。

### 返回字段职责

| 字段 | 说明 |
|---|---|
| `key` | Prompt 的唯一 Key,业务系统据此调用 |
| `name` | 展示名称,便于排查问题时辨认 |
| `version` | 实际返回的版本号 |
| `template` | Prompt 正文,变量保留 `{{name}}` 占位,由业务系统自行替换 |
| `variables` | 变量定义,业务系统据此校验和组装入参 |

只返回当前业务用例需要的字段,不返回 `id`、`created_by`、统计数字这类调用方用不到的内部信息。

变量在第一版只支持 `text` 类型,`description` 可空。

## 错误约定

| 情况 | 状态码 | 是否写 Usage |
|---|---|---|
| 缺少或格式错误的 API Key | 401 | 否 |
| Key 已禁用或已删除 | 401 | 否 |
| Tenant 内不存在该 Key | 404 | 否 |
| 没有可用的 Published 版本 | 404 | 否 |
| Prompt 存在但版本号不存在 | 404 | 否 |
| 版本号不是正整数 | 400 | 否 |

对外只区分"未认证、找不到、不可用"三类结果,不泄露记录是否存在、草稿内容或内部 ID。

## 调用统计口径

- API 成功返回 Prompt,记为一次调用;认证失败、找不到、不可用都不计入调用次数。
- 每次记录 Tenant、Prompt、Prompt Version、API Key、调用状态、响应耗时和调用时间。
- 调用次数按 Prompt 聚合,同时支持今日、本周、本月、全部四个时间范围。
- 统计页面的数字直接来自调用记录,不做额外的计数缓存,避免两处口径不一致。

## 修改历史

- 2026-09-22 实现落地:补上各错误情况对应的状态码和是否计入调用,确认按版本号可以取到已经归档的历史版本。
- 2026-09-22 首次创建,记录第一版的对外接口、认证流程和统计口径。
