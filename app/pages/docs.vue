<script setup lang="ts">
import {
  apiEndpoints,
  apiErrorCodes,
  curlExample,
  type ApiDocEndpoint,
} from '#shared/api-catalog'

definePageMeta({ layout: false })

useHead({
  title: 'Prompt API 接口文档',
  meta: [{ name: 'description', content: 'Prompt 管理系统的对外接口文档:认证方式、查询接口、维护接口和错误码。' }],
})

const baseUrl = useRequestURL().origin
const readEndpoints = computed(() => apiEndpoints.filter(item => item.kind === 'read'))
const writeEndpoints = computed(() => apiEndpoints.filter(item => item.kind === 'write'))

const methodStyle: Record<string, string> = {
  GET: 'bg-emerald-50 text-emerald-700',
  POST: 'bg-accent-500/10 text-accent-600',
  PATCH: 'bg-amber-50 text-amber-700',
  DELETE: 'bg-red-50 text-red-600',
}

function example(endpoint: ApiDocEndpoint) {
  return curlExample(endpoint, baseUrl)
}

const authExample = `curl "${baseUrl}/api/v1/prompts/customer-analysis" \\
  -H "Authorization: Bearer pk_live_xxxxx"`
</script>

<template>
  <div class="min-h-screen bg-ink-50">
    <header class="sticky top-0 z-10 border-b border-ink-200 bg-white/85 backdrop-blur">
      <div class="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
        <div class="flex items-baseline gap-2">
          <span class="text-sm font-semibold">Prompt 管理系统</span>
          <span class="text-xs text-ink-400">接口文档</span>
        </div>
        <NuxtLink to="/login" class="text-sm text-ink-600 hover:text-ink-900">进入控制台</NuxtLink>
      </div>
    </header>

    <main class="mx-auto max-w-4xl space-y-8 px-6 py-8">
      <section>
        <h1 class="text-2xl font-semibold">Prompt API</h1>
        <p class="mt-2 text-sm leading-6 text-ink-600">
          业务系统用一把 API Key 就能读取和维护 Prompt:读接口拿发布版本,写接口创建、修改、发布和删除。
          接口地址以 <code class="rounded bg-ink-100 px-1 py-0.5 text-xs">{{ baseUrl }}/api/v1</code> 为前缀,请求和响应都是 JSON。
        </p>
      </section>

      <section class="card p-5">
        <h2 class="text-base font-semibold">认证与权限</h2>
        <p class="mt-2 text-sm leading-6 text-ink-600">
          每个请求都要在请求头带上 API Key。Key 在控制台的「API Keys」页面创建,创建时选择权限,
          完整 Key 只在创建成功时展示一次。
        </p>
        <div class="mt-3 flex items-center justify-between">
          <span class="text-xs text-ink-400">请求头</span>
          <CopyButton :text="`Authorization: Bearer pk_live_xxxxx`" />
        </div>
        <pre class="mt-1 overflow-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-100">Authorization: Bearer pk_live_xxxxx</pre>

        <table class="mt-4 w-full text-sm">
          <thead class="text-left text-xs text-ink-400">
            <tr>
              <th class="py-1.5 font-medium">权限</th>
              <th class="py-1.5 font-medium">可以调用</th>
              <th class="py-1.5 font-medium">说明</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-t border-ink-100">
              <td class="py-2 pr-3"><span class="badge bg-ink-100 text-ink-600">read</span></td>
              <td class="py-2 pr-3">查询接口</td>
              <td class="py-2 text-ink-600">默认权限,读不到草稿</td>
            </tr>
            <tr class="border-t border-ink-100">
              <td class="py-2 pr-3"><span class="badge bg-accent-500/10 text-accent-600">write</span></td>
              <td class="py-2 pr-3">查询接口 + 维护接口</td>
              <td class="py-2 text-ink-600">可以创建、修改、发布和删除 Prompt</td>
            </tr>
          </tbody>
        </table>

        <p class="mt-3 text-xs text-ink-400">
          Key 决定这次请求能访问哪个租户的数据,请求参数不能指定租户。Key 被禁用或删除后立即失效,返回 401。
        </p>
      </section>

      <section class="space-y-4">
        <div>
          <h2 class="text-base font-semibold">查询接口</h2>
          <p class="mt-1 text-sm text-ink-600">只读 Key 就能调用。取到发布版本的两个接口会记入调用统计。</p>
        </div>
        <article v-for="endpoint in readEndpoints" :key="endpoint.id" class="card p-5">
          <div class="flex flex-wrap items-center gap-3">
            <span class="badge" :class="methodStyle[endpoint.method]">{{ endpoint.method }}</span>
            <code class="text-sm font-medium">/api/v1{{ endpoint.path }}</code>
          </div>
          <h3 class="mt-3 text-sm font-semibold">{{ endpoint.title }}</h3>
          <p class="mt-1 text-sm leading-6 text-ink-600">{{ endpoint.description }}</p>

          <div v-if="endpoint.params.length > 0" class="mt-3">
            <table class="w-full text-sm">
              <thead class="text-left text-xs text-ink-400">
                <tr>
                  <th class="py-1.5 font-medium">参数</th>
                  <th class="py-1.5 font-medium">位置</th>
                  <th class="py-1.5 font-medium">类型</th>
                  <th class="py-1.5 font-medium">说明</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="param in endpoint.params" :key="param.name" class="border-t border-ink-100">
                  <td class="py-2 pr-3 font-mono text-xs">
                    {{ param.name }}<span v-if="param.required" class="text-red-500">*</span>
                  </td>
                  <td class="py-2 pr-3 text-ink-400">{{ param.in }}</td>
                  <td class="py-2 pr-3 text-ink-400">{{ param.type }}</td>
                  <td class="py-2 text-ink-600">{{ param.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mt-4 flex items-center justify-between">
            <span class="text-xs text-ink-400">示例响应</span>
            <CopyButton :text="endpoint.response" />
          </div>
          <pre class="mt-1 max-h-72 overflow-auto rounded-lg bg-ink-900 p-3 text-xs leading-5 text-ink-100">{{ endpoint.response }}</pre>

          <div class="mt-4 flex items-center justify-between">
            <span class="text-xs text-ink-400">调用示例</span>
            <CopyButton :text="example(endpoint)" />
          </div>
          <pre class="mt-1 overflow-auto rounded-lg bg-ink-50 p-3 text-xs leading-5">{{ example(endpoint) }}</pre>
        </article>
      </section>

      <section class="space-y-4">
        <div>
          <h2 class="text-base font-semibold">维护接口</h2>
          <p class="mt-1 text-sm text-ink-600">
            需要 write 权限的 Key。写入规则和控制台完全一致,维护接口的调用不计入 Prompt 使用统计。
          </p>
        </div>
        <article v-for="endpoint in writeEndpoints" :key="endpoint.id" class="card p-5">
          <div class="flex flex-wrap items-center gap-3">
            <span class="badge" :class="methodStyle[endpoint.method]">{{ endpoint.method }}</span>
            <code class="text-sm font-medium">/api/v1{{ endpoint.path }}</code>
            <span class="badge bg-accent-500/10 text-accent-600">需要 write</span>
          </div>
          <h3 class="mt-3 text-sm font-semibold">{{ endpoint.title }}</h3>
          <p class="mt-1 text-sm leading-6 text-ink-600">{{ endpoint.description }}</p>

          <div v-if="endpoint.params.length > 0" class="mt-3">
            <table class="w-full text-sm">
              <thead class="text-left text-xs text-ink-400">
                <tr>
                  <th class="py-1.5 font-medium">参数</th>
                  <th class="py-1.5 font-medium">位置</th>
                  <th class="py-1.5 font-medium">类型</th>
                  <th class="py-1.5 font-medium">说明</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="param in endpoint.params" :key="param.name" class="border-t border-ink-100">
                  <td class="py-2 pr-3 font-mono text-xs">
                    {{ param.name }}<span v-if="param.required" class="text-red-500">*</span>
                  </td>
                  <td class="py-2 pr-3 text-ink-400">{{ param.in }}</td>
                  <td class="py-2 pr-3 text-ink-400">{{ param.type }}</td>
                  <td class="py-2 text-ink-600">{{ param.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <template v-if="endpoint.request">
            <div class="mt-4 flex items-center justify-between">
              <span class="text-xs text-ink-400">示例请求体</span>
              <CopyButton :text="endpoint.request" />
            </div>
            <pre class="mt-1 max-h-72 overflow-auto rounded-lg bg-ink-900 p-3 text-xs leading-5 text-ink-100">{{ endpoint.request }}</pre>
          </template>

          <div class="mt-4 flex items-center justify-between">
            <span class="text-xs text-ink-400">示例响应</span>
            <CopyButton :text="endpoint.response" />
          </div>
          <pre class="mt-1 max-h-72 overflow-auto rounded-lg bg-ink-900 p-3 text-xs leading-5 text-ink-100">{{ endpoint.response }}</pre>

          <div class="mt-4 flex items-center justify-between">
            <span class="text-xs text-ink-400">调用示例</span>
            <CopyButton :text="example(endpoint)" />
          </div>
          <pre class="mt-1 overflow-auto rounded-lg bg-ink-50 p-3 text-xs leading-5">{{ example(endpoint) }}</pre>
        </article>
      </section>

      <section class="card p-5">
        <h2 class="text-base font-semibold">错误码</h2>
        <p class="mt-2 text-sm leading-6 text-ink-600">
          出错时响应体里带一个稳定的 <code class="rounded bg-ink-100 px-1 py-0.5 text-xs">error</code> 对象,
          可以直接按 <code class="rounded bg-ink-100 px-1 py-0.5 text-xs">error.code</code> 分支处理。
        </p>
        <table class="mt-3 w-full text-sm">
          <thead class="text-left text-xs text-ink-400">
            <tr>
              <th class="py-1.5 font-medium">code</th>
              <th class="py-1.5 font-medium">状态码</th>
              <th class="py-1.5 font-medium">含义</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in apiErrorCodes" :key="item.code" class="border-t border-ink-100">
              <td class="py-2 pr-3 font-mono text-xs">{{ item.code }}</td>
              <td class="py-2 pr-3 text-ink-400">{{ item.status }}</td>
              <td class="py-2 text-ink-600">{{ item.meaning }}</td>
            </tr>
          </tbody>
        </table>
        <div class="mt-4 flex items-center justify-between">
          <span class="text-xs text-ink-400">示例错误响应</span>
          <CopyButton text='{ "statusCode": 403, "statusMessage": "当前 API Key 只有查询权限", "error": { "code": "forbidden", "message": "当前 API Key 只有查询权限" } }' />
        </div>
        <pre class="mt-1 overflow-auto rounded-lg bg-ink-900 p-3 text-xs leading-5 text-ink-100">{
  "statusCode": 403,
  "statusMessage": "当前 API Key 只有查询权限",
  "error": { "code": "forbidden", "message": "当前 API Key 只有查询权限" }
}</pre>
        <p class="mt-3 text-xs text-ink-400">
          路径写错时同样返回 JSON 404 <code class="rounded bg-ink-100 px-1 py-0.5">not_found</code>,不会返回 HTML 页面。
        </p>
      </section>

      <section class="card p-5">
        <h2 class="text-base font-semibold">不在对外范围内的能力</h2>
        <ul class="mt-2 space-y-1.5 text-sm text-ink-600">
          <li>· API Key 管理、成员管理和租户设置只在控制台里操作,不对外开放。</li>
          <li>· 草稿不会被查询接口返回,只有发布过的版本能取到。</li>
          <li>· 维护接口不计入调用统计,统计只记「取到发布版本」的调用。</li>
        </ul>
        <div class="mt-4 flex items-center justify-between">
          <span class="text-xs text-ink-400">先登录控制台创建 API Key</span>
          <NuxtLink to="/login" class="btn-ghost text-sm">进入控制台</NuxtLink>
        </div>
      </section>
    </main>

    <footer class="mx-auto max-w-4xl px-6 pb-10 text-xs text-ink-400">
      示例里的 Key 只是占位,请用自己在控制台创建的 Key 调用。
    </footer>
  </div>
</template>
