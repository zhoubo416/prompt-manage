# Prompt 管理系统产品说明书

## 一、产品概述

### 1.1 产品定位

Prompt 管理系统是一个面向个人和团队的 Prompt Template 管理平台。

系统主要解决：

1. Prompt 分散在代码、文档、聊天记录中，难以统一维护。
2. Prompt 修改后无法追踪历史版本。
3. 业务系统需要把 Prompt 写死在代码中，修改 Prompt 必须重新发布程序。
4. 无法了解 Prompt 的实际使用情况。

系统通过统一的 Prompt 管理平台，将 Prompt 从业务代码中独立出来。

核心流程：

```text
创建 Prompt
    ↓
分类管理
    ↓
版本管理
    ↓
发布
    ↓
业务系统通过 API 获取
    ↓
记录调用
    ↓
统计使用情况
```

---

# 二、产品目标

第一阶段只解决三个核心问题：

### 目标 1：统一管理 Prompt

用户可以创建、编辑、分类和维护 Prompt。

### 目标 2：通过 API 使用 Prompt

业务系统通过 API Key 获取指定 Prompt，不需要将 Prompt 内容直接写入业务代码。

### 目标 3：统计 Prompt 使用情况

系统记录 Prompt API 调用情况，提供调用次数等基础统计。

---

# 三、核心概念

## 3.1 Tenant

Tenant 是系统的数据隔离单位。

一个用户可以属于一个或多个 Tenant。

例如：

```text
个人空间
    ↓
Tenant A

公司空间
    ↓
Tenant B
```

Tenant 内的数据默认相互隔离。

第一版虽然主要面向个人使用，但保留 Tenant 模型，为后续团队协作、企业空间和共享 Prompt 做准备。

---

## 3.2 Category

Category 用于组织和管理 Prompt。

例如：

```text
客户
会议
内容
编程
其他
```

第一版只支持一级分类。

```text
Category
   ↓
Prompt
```

暂不支持多级分类。

---

## 3.3 Prompt

Prompt 是系统管理的基本对象。

一个 Prompt 包含：

```text
名称
唯一 Key
分类
描述
当前版本
创建者
创建时间
更新时间
```

例如：

```text
名称：客户信息分析

Key：
customer-analysis

分类：
客户

描述：
分析客户信息，提取客户需求和潜在风险
```

### Name

用于用户阅读和识别。

可以修改。

### Key

用于 API 调用。

例如：

```text
customer-analysis
meeting-summary
code-review
```

同一个 Tenant 内 Key 必须唯一。

Key 创建后原则上不建议修改，以避免影响已经接入的业务系统。

---

# 四、Prompt 版本管理

Prompt 不直接覆盖历史内容。

每次修改并保存，可以生成一个新的版本。

例如：

```text
customer-analysis

v1
v2
v3
```

其中：

```text
v3 = 当前发布版本
```

每个版本保存：

```text
版本号
Prompt 内容
变量定义
状态
创建者
创建时间
```

版本状态：

```text
Draft
Published
Archived
```

### 版本规则

- Draft：编辑中的版本
- Published：可以通过 API 获取
- Archived：历史版本，不再作为默认版本

API 默认获取最新的 Published 版本。

同时支持指定版本：

```text
customer-analysis:v2
```

用于需要固定 Prompt 版本的业务。

---

# 五、Prompt 分类管理

## 5.1 分类列表

用户可以维护自己的分类。

例如：

```text
全部

客户
会议
内容
编程
其他
```

分类可以：

- 创建
- 修改名称
- 调整排序
- 删除

## 5.2 删除分类

如果分类下存在 Prompt，不允许直接删除。

用户需要选择：

```text
删除「客户」分类

该分类下有 12 个 Prompt。

请选择：

○ 移动到「其他」
○ 移动到其他分类

[取消] [确认]
```

避免 Prompt 因分类删除而丢失。

---

# 六、Prompt 管理页面

系统首页默认进入 Prompt 管理。

页面结构：

```text
Prompt
────────────────────────────────────

[全部] [客户] [会议] [内容] [编程]

搜索 Prompt                         [+ 新建]

名称                  分类       版本       调用次数

客户信息分析          客户       v3         12,832
客户信息总结          客户       v2          8,321
会议总结              会议       v4          6,321
文章改写              内容       v5          3,421
代码审查              编程       v1            823
```

支持：

- 分类筛选
- 名称搜索
- Key 搜索
- 查看版本
- 查看调用次数
- 创建 Prompt
- 编辑 Prompt

---

# 七、Prompt 创建

点击“新建 Prompt”。

页面：

```text
新建 Prompt

分类
[客户 ▼]

名称
客户信息分析

Key
customer-analysis

描述
分析客户资料，提取客户需求和潜在风险

Prompt

┌───────────────────────────────┐
│ 你是一名专业的客户分析助手。   │
│                               │
│ 请分析以下客户信息：           │
│                               │
│ {{customer_info}}             │
└───────────────────────────────┘

变量

customer_info
类型：Text
必填：是

[保存草稿]
[发布]
```

---

# 八、Prompt Template

Prompt 支持变量。

例如：

```text
你是一名专业的客户分析助手。

请分析以下客户信息：

{{customer_info}}

请输出：
1. 客户核心需求
2. 潜在风险
3. 下一步建议
```

系统自动识别：

```text
customer_info
```

作为变量。

变量至少包含：

```text
name
type
required
description
```

第一版支持：

```text
Text
```

即可。

以后可以扩展：

```text
Number
Boolean
JSON
```

---

# 九、Prompt 测试

Prompt 编辑页面提供模板预览能力。

例如变量：

```text
customer_info
```

输入：

```text
某制造企业，希望使用 AI 改造客服系统……
```

系统生成最终 Prompt：

```text
你是一名专业的客户分析助手。

请分析以下客户信息：

某制造企业，希望使用 AI 改造客服系统……
```

第一版主要用于检查变量替换是否正确。

暂不要求系统直接调用大模型。

后续可以增加：

```text
[调用模型测试]
```

支持不同模型进行测试。

---

# 十、API Key

用户可以创建 API Key，让外部业务系统访问 Prompt。

页面：

```text
API Keys
────────────────────────────────

名称            创建时间       最后使用       状态

Production      2026-09-20     2分钟前         Active
Development     2026-09-15     1小时前         Active

[+ 创建 API Key]
```

创建 API Key：

```text
名称：

Production
```

生成：

```text
pk_live_xxxxxxxxxxxxxxxxxxxx
```

API Key 只在创建成功后完整显示一次。

用户可以：

- 创建 Key
- 查看 Key
- 禁用 Key
- 删除 Key

---

# 十一、API Key 安全

系统不保存 API Key 明文。

数据库保存：

```text
key_prefix
key_hash
tenant_id
status
created_at
last_used_at
```

例如：

```text
pk_live_8f3a...
```

用于识别 Key。

完整 Key 只在创建时展示给用户。

---

# 十二、Prompt API

业务系统使用 API Key 调用 Prompt。

## 12.1 获取 Prompt

```http
GET /api/v1/prompts/{key}
Authorization: Bearer pk_live_xxxxx
```

例如：

```http
GET /api/v1/prompts/customer-analysis
Authorization: Bearer pk_live_xxxxx
```

返回：

```json
{
  "key": "customer-analysis",
  "name": "客户信息分析",
  "version": 3,
  "template": "你是一名专业的客户分析助手……",
  "variables": [
    {
      "name": "customer_info",
      "type": "text",
      "required": true
    }
  ]
}
```

---

# 十三、指定版本 API

业务系统可以固定使用某个版本。

```http
GET /api/v1/prompts/customer-analysis/versions/2
```

返回：

```json
{
  "key": "customer-analysis",
  "version": 2,
  "template": "...",
  "variables": []
}
```

这样业务系统可以选择：

```text
最新版本
```

或者：

```text
固定版本
```

---

# 十四、Prompt API 认证流程

```text
业务系统
    │
    │ API Key
    ↓
Prompt API
    │
    ├── 验证 API Key
    │
    ├── 获取 tenant_id
    │
    ├── 查询 Prompt
    │
    ├── 查询 Published Version
    │
    └── 记录 Usage
          │
          ↓
       返回 Prompt
```

API Key 决定业务系统能够访问哪个 Tenant 的数据。

---

# 十五、调用统计

系统记录每次 Prompt API 调用。

第一版定义：

> API 成功返回 Prompt，记为一次调用。

记录：

```text
Tenant
Prompt
Prompt Version
API Key
调用时间
调用状态
响应耗时
```

---

# 十六、统计页面

Analytics 页面：

```text
Usage
────────────────────────────────────

今日调用
12,832

本周调用
83,291

本月调用
321,823

总调用
1,283,291


Prompt 调用排行

客户信息分析       52,832
会议总结            31,293
文章改写            18,293
代码审查            12,832
```

可以按照：

```text
今日
本周
本月
全部
```

进行筛选。

---

# 十七、Prompt 详情页

Prompt 详情：

```text
客户信息分析

客户
customer-analysis

分析客户资料，提取客户需求和潜在风险

调用次数
52,832

────────────────────────────────

当前版本

v3   Published

────────────────────────────────

Prompt

你是一名专业的客户分析助手……

────────────────────────────────

变量

customer_info
Text
Required

────────────────────────────────

版本历史

v3   Published    2026-09-20
v2   Archived     2026-09-15
v1   Archived     2026-09-10
```

用户可以：

```text
编辑
创建新版本
查看历史版本
查看调用统计
```

---

# 十八、数据模型

## tenants

```text
id
name
created_at
```

## users

```text
id
tenant_id
email
role
created_at
```

如果使用 Supabase Auth，用户身份可以直接使用 Auth User ID。

## categories

```text
id
tenant_id
name
description
sort_order
created_at
```

## prompts

```text
id
tenant_id
category_id
name
key
description
current_version
created_by
created_at
updated_at
```

## prompt_versions

```text
id
prompt_id
version
content
variables
status
created_by
created_at
```

## api_keys

```text
id
tenant_id
name
key_prefix
key_hash
status
last_used_at
created_at
```

## prompt_usage

```text
id
tenant_id
prompt_id
prompt_version
api_key_id
status
latency
created_at
```

---

# 十九、权限与数据隔离

Tenant 是系统的数据隔离边界。

任何业务数据查询都必须基于：

```text
tenant_id
```

例如：

```text
Tenant A
    ↓
Prompt A

Tenant B
    ↓
Prompt B
```

Tenant A 无法访问 Tenant B 的 Prompt、Category、API Key 和 Usage。

如果使用 Supabase，建议使用 RLS 实现数据隔离。

---

# 二十、角色

第一版支持：

```text
Owner
Admin
Member
```

权限：

| 功能 | Owner | Admin | Member |
|---|---:|---:|---:|
| 查看 Prompt | ✓ | ✓ | ✓ |
| 创建 Prompt | ✓ | ✓ | ✓ |
| 编辑 Prompt | ✓ | ✓ | ✓ |
| 删除 Prompt | ✓ | ✓ | × |
| API Key 管理 | ✓ | ✓ | × |
| 查看 Usage | ✓ | ✓ | ✓ |
| 成员管理 | ✓ | ✓ | × |
| Tenant 设置 | ✓ | × | × |

---

# 二十一、核心业务流程

## 流程 1：创建 Prompt

```text
用户
 ↓
选择分类
 ↓
输入名称
 ↓
设置 Key
 ↓
填写 Prompt
 ↓
定义变量
 ↓
保存
 ↓
生成 v1
```

---

## 流程 2：修改 Prompt

```text
打开 Prompt
 ↓
编辑
 ↓
保存
 ↓
生成新版本
 ↓
v2
 ↓
发布
 ↓
成为当前版本
```

历史版本不被覆盖。

---

## 流程 3：业务系统调用

```text
业务系统
 ↓
API Key
 ↓
GET /api/v1/prompts/customer-analysis
 ↓
验证 Key
 ↓
确定 Tenant
 ↓
获取 Published Version
 ↓
记录 Usage
 ↓
返回 Prompt
```

---

# 二十二、MVP 范围

第一版必须完成：

### Prompt

- 创建
- 编辑
- 删除
- 分类
- 搜索
- Key
- Prompt Template
- 变量
- 版本管理
- 发布

### API

- API Key 创建
- API Key 禁用
- API Key 删除
- 获取 Prompt
- 获取指定版本

### Usage

- 调用次数
- 按 Prompt 查看调用次数
- 基础时间范围统计

### 用户

- 登录
- Tenant
- 基础角色
- Tenant 数据隔离

---

# 二十三、暂不实现

为了控制 MVP 复杂度，第一版暂时不做：

- LLM 调用
- Prompt 自动优化
- Prompt 评分
- A/B Test
- 多模型对比
- Token 成本统计
- Trace
- Agent
- Prompt Marketplace
- 公共 Prompt
- 多级分类
- 团队复杂权限
- Billing
- Webhook

这些可以在 Prompt 管理基础设施稳定以后再增加。

---

# 二十四、后续扩展方向

系统未来可以自然演化成：

```text
Prompt 管理
      ↓
Prompt Version
      ↓
Prompt API
      ↓
Usage
      ↓
Prompt 测试
      ↓
模型测试
      ↓
效果评估
      ↓
Prompt 优化
```

最终形成：

```text
                  Prompt Hub

       ┌────────── Prompt 管理
       │
       ├────────── Version 管理
       │
       ├────────── API 服务
       │
       ├────────── API Key
       │
       ├────────── Usage
       │
       └────────── Evaluation
```

第一阶段的核心原则是：

> **Prompt 是独立于业务代码的配置资产，业务系统通过稳定的 Key + API 获取 Prompt，Prompt 的修改通过版本管理完成，所有 API 使用行为可以被追踪和统计。**