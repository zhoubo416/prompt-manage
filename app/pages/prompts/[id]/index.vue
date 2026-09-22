<script setup lang="ts">
const route = useRoute()
const session = useSessionState()
const id = route.params.id as string

const { data, refresh } = await useFetch(`/api/prompts/${id}`)
const prompt = computed(() => data.value?.prompt)
const versions = computed(() => data.value?.versions ?? [])
const current = computed(() => versions.value.find(item => item.status === 'published') ?? versions.value[0])
const openVersionId = ref<string | null>(null)
const busy = ref(false)
const message = ref('')

const canDelete = computed(() => session.value?.role !== 'member')
const apiExample = computed(() => `curl http://localhost:3000/api/v1/prompts/${prompt.value?.key} \\\n  -H "Authorization: Bearer pk_live_xxx"`)

async function removePrompt() {
  if (!confirm(`确定删除「${prompt.value?.name}」吗?版本历史和调用记录会一起删除。`)) {
    return
  }
  busy.value = true
  try {
    await $fetch(`/api/prompts/${id}`, { method: 'DELETE' })
    await navigateTo('/prompts')
  } catch (error) {
    message.value = errorMessage(error)
  } finally {
    busy.value = false
  }
}

async function publishVersion(version: number) {
  busy.value = true
  message.value = ''
  try {
    await $fetch(`/api/prompts/${id}/versions`, { method: 'POST', body: { publish: true, version } })
    await refresh()
  } catch (error) {
    message.value = errorMessage(error)
  } finally {
    busy.value = false
  }
}

const statusStyle: Record<string, string> = {
  published: 'bg-emerald-50 text-emerald-700',
  draft: 'bg-amber-50 text-amber-700',
  archived: 'bg-ink-100 text-ink-400',
}
</script>

<template>
  <div v-if="prompt" class="space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-lg font-semibold">{{ prompt.name }}</h1>
          <span class="badge bg-ink-100 text-ink-600">{{ prompt.categoryName }}</span>
        </div>
        <p class="mt-1 font-mono text-sm text-ink-400">{{ prompt.key }}</p>
        <p v-if="prompt.description" class="mt-2 text-sm text-ink-600">{{ prompt.description }}</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink :to="`/prompts/${id}/edit`" class="btn-primary">编辑</NuxtLink>
        <button v-if="canDelete" class="btn-ghost text-red-600" :disabled="busy" @click="removePrompt">
          删除
        </button>
      </div>
    </div>

    <p v-if="message" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ message }}</p>

    <div class="grid gap-4 sm:grid-cols-3">
      <div class="card p-4">
        <p class="text-xs text-ink-400">调用次数</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums">{{ formatNumber(prompt.usageCount) }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-ink-400">当前版本</p>
        <p class="mt-1 text-2xl font-semibold">
          {{ prompt.currentVersion ? `v${prompt.currentVersion}` : '未发布' }}
        </p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-ink-400">最近更新</p>
        <p class="mt-1 text-2xl font-semibold">{{ formatDate(prompt.updatedAt) }}</p>
      </div>
    </div>

    <section v-if="current" class="card p-5">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-ink-800">
          当前内容
          <span class="badge ml-1" :class="statusStyle[current.status]">v{{ current.version }} {{ current.status }}</span>
        </h2>
        <span class="text-xs text-ink-400">{{ formatDate(current.createdAt) }}</span>
      </div>
      <pre class="mt-3 overflow-auto rounded-lg bg-ink-900 p-4 text-[13px] leading-6 text-ink-100 whitespace-pre-wrap">{{ current.content }}</pre>

      <h3 class="mt-5 text-sm font-semibold text-ink-800">变量</h3>
      <div v-if="current.variables.length === 0" class="mt-2 text-sm text-ink-400">没有变量</div>
      <table v-else class="mt-2 w-full text-sm">
        <thead class="text-left text-xs text-ink-400">
          <tr>
            <th class="py-1.5 font-medium">名称</th>
            <th class="py-1.5 font-medium">类型</th>
            <th class="py-1.5 font-medium">必填</th>
            <th class="py-1.5 font-medium">说明</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="variable in current.variables" :key="variable.name" class="border-t border-ink-100">
            <td class="py-2 font-mono text-xs">{{ variable.name }}</td>
            <td class="py-2 text-ink-600">{{ variable.type }}</td>
            <td class="py-2 text-ink-600">{{ variable.required ? '是' : '否' }}</td>
            <td class="py-2 text-ink-600">{{ variable.description || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="card p-5">
      <h2 class="text-sm font-semibold text-ink-800">版本历史</h2>
      <div class="mt-3 divide-y divide-ink-100">
        <div v-for="version in versions" :key="version.id" class="py-3">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="font-mono text-sm">v{{ version.version }}</span>
              <span class="badge" :class="statusStyle[version.status]">{{ version.status }}</span>
              <span class="text-xs text-ink-400">{{ formatDate(version.createdAt) }}</span>
            </div>
            <div class="flex items-center gap-3 text-sm">
              <button class="text-ink-400 hover:text-ink-800" @click="openVersionId = openVersionId === version.id ? null : version.id">
                {{ openVersionId === version.id ? '收起' : '查看内容' }}
              </button>
              <button
                v-if="version.status === 'draft'"
                class="text-accent-600 hover:text-accent-500"
                :disabled="busy"
                @click="publishVersion(version.version)"
              >
                发布
              </button>
            </div>
          </div>
          <pre
            v-if="openVersionId === version.id"
            class="mt-3 overflow-auto rounded-lg bg-ink-50 p-3 text-xs leading-5 whitespace-pre-wrap"
          >{{ version.content }}</pre>
        </div>
        <p v-if="versions.length === 0" class="py-6 text-sm text-ink-400">还没有版本</p>
      </div>
    </section>

    <section class="card p-5">
      <h2 class="text-sm font-semibold text-ink-800">调用方式</h2>
      <p class="mt-1 text-xs text-ink-400">业务系统用 API Key 调用,Key 在「API Keys」页面创建</p>
      <pre class="mt-3 overflow-auto rounded-lg bg-ink-900 p-4 text-xs leading-6 text-ink-100">{{ apiExample }}</pre>
    </section>
  </div>
  <div v-else class="card p-6 text-sm text-ink-400">Prompt 不存在</div>
</template>
