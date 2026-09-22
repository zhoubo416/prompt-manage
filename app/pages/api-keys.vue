<script setup lang="ts">
const { data, refresh } = await useFetch('/api/api-keys')
const apiKeys = computed(() => data.value?.apiKeys ?? [])

const name = ref('')
const message = ref('')
const busy = ref(false)
const issued = ref<{ name: string, key: string } | null>(null)
const copied = ref(false)

async function create() {
  busy.value = true
  message.value = ''
  try {
    const created = await $fetch<{ name: string, key: string }>('/api/api-keys', {
      method: 'POST',
      body: { name: name.value },
    })
    issued.value = { name: created.name, key: created.key }
    name.value = ''
    copied.value = false
    await refresh()
  } catch (error) {
    message.value = errorMessage(error)
  } finally {
    busy.value = false
  }
}

async function toggleStatus(item: { id: string, status: string }) {
  busy.value = true
  try {
    await $fetch(`/api/api-keys/${item.id}`, {
      method: 'PATCH',
      body: { status: item.status === 'active' ? 'disabled' : 'active' },
    })
    await refresh()
  } catch (error) {
    message.value = errorMessage(error)
  } finally {
    busy.value = false
  }
}

async function remove(item: { id: string, name: string }) {
  if (!confirm(`确定删除 API Key「${item.name}」吗?使用它的业务系统会立即失效。`)) {
    return
  }
  busy.value = true
  try {
    await $fetch(`/api/api-keys/${item.id}`, { method: 'DELETE' })
    await refresh()
  } catch (error) {
    message.value = errorMessage(error)
  } finally {
    busy.value = false
  }
}

async function copyKey() {
  if (!issued.value) {
    return
  }
  await navigator.clipboard.writeText(issued.value.key)
  copied.value = true
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-lg font-semibold">API Keys</h1>
      <p class="text-sm text-ink-400">业务系统用它调用 Prompt API,系统只保存前缀和哈希</p>
    </div>

    <p v-if="message" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ message }}</p>

    <section class="card p-5">
      <h2 class="text-sm font-semibold text-ink-800">创建 API Key</h2>
      <div class="mt-3 flex flex-wrap gap-3">
        <input v-model="name" class="field w-56" placeholder="名称,例如 Production">
        <button class="btn-primary" :disabled="busy || !name.trim()" @click="create">生成</button>
      </div>
    </section>

    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-ink-50 text-left text-xs text-ink-400">
          <tr>
            <th class="px-4 py-2.5 font-medium">名称</th>
            <th class="px-4 py-2.5 font-medium">Key 前缀</th>
            <th class="px-4 py-2.5 font-medium">创建时间</th>
            <th class="px-4 py-2.5 font-medium">最后使用</th>
            <th class="px-4 py-2.5 font-medium">状态</th>
            <th class="px-4 py-2.5 text-right font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in apiKeys" :key="item.id" class="border-t border-ink-100">
            <td class="px-4 py-3 font-medium">{{ item.name }}</td>
            <td class="px-4 py-3 font-mono text-xs text-ink-600">{{ item.keyPrefix }}…</td>
            <td class="px-4 py-3 text-ink-400">{{ formatDate(item.createdAt) }}</td>
            <td class="px-4 py-3 text-ink-400">{{ formatRelative(item.lastUsedAt) }}</td>
            <td class="px-4 py-3">
              <span
                class="badge"
                :class="item.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-ink-100 text-ink-400'"
              >
                {{ item.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <button class="text-ink-600 hover:text-ink-900" :disabled="busy" @click="toggleStatus(item)">
                {{ item.status === 'active' ? '禁用' : '启用' }}
              </button>
              <button class="ml-3 text-red-600 hover:text-red-500" :disabled="busy" @click="remove(item)">
                删除
              </button>
            </td>
          </tr>
          <tr v-if="apiKeys.length === 0">
            <td colspan="6" class="px-4 py-10 text-center text-sm text-ink-400">
              还没有 API Key
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="issued" class="fixed inset-0 z-20 flex items-center justify-center bg-ink-900/40 px-4">
      <div class="card w-full max-w-lg p-5">
        <h3 class="text-base font-semibold">API Key 创建成功</h3>
        <p class="mt-2 text-sm text-ink-600">
          完整 Key 只显示这一次,离开这个弹窗后就看不到了,请先保存到安全的地方。
        </p>
        <pre class="mt-3 overflow-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-100">{{ issued.key }}</pre>
        <div class="mt-5 flex justify-end gap-2">
          <button class="btn-ghost" @click="copyKey">{{ copied ? '已复制' : '复制' }}</button>
          <button class="btn-primary" @click="issued = null">我已保存</button>
        </div>
      </div>
    </div>
  </div>
</template>
