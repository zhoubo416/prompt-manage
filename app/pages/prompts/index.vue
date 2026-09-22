<script setup lang="ts">
const categoryId = ref('')
const searchInput = ref('')
const search = ref('')

let timer: ReturnType<typeof setTimeout> | undefined
watch(searchInput, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    search.value = value.trim()
  }, 300)
})

const { data: categoryData } = await useFetch('/api/categories')
const { data, refresh } = await useFetch('/api/prompts', {
  query: computed(() => ({
    categoryId: categoryId.value || undefined,
    search: search.value || undefined,
  })),
})

const categories = computed(() => categoryData.value?.categories ?? [])
const prompts = computed(() => data.value?.prompts ?? [])
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-lg font-semibold">Prompt</h1>
        <p class="text-sm text-ink-400">共 {{ prompts.length }} 个 Prompt</p>
      </div>
      <NuxtLink to="/prompts/new" class="btn-primary">+ 新建</NuxtLink>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button
        class="badge border px-3 py-1.5"
        :class="categoryId === '' ? 'border-accent-500 bg-accent-500/10 text-accent-600' : 'border-ink-200 text-ink-600'"
        @click="categoryId = ''"
      >
        全部
      </button>
      <button
        v-for="category in categories"
        :key="category.id"
        class="badge border px-3 py-1.5"
        :class="categoryId === category.id ? 'border-accent-500 bg-accent-500/10 text-accent-600' : 'border-ink-200 text-ink-600'"
        @click="categoryId = category.id"
      >
        {{ category.name }}
      </button>
      <input
        v-model="searchInput"
        class="field ml-auto w-64"
        placeholder="搜索名称或 Key"
      >
    </div>

    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-ink-50 text-left text-xs text-ink-400">
          <tr>
            <th class="px-4 py-2.5 font-medium">名称</th>
            <th class="px-4 py-2.5 font-medium">分类</th>
            <th class="px-4 py-2.5 font-medium">版本</th>
            <th class="px-4 py-2.5 text-right font-medium">调用次数</th>
            <th class="px-4 py-2.5 font-medium">更新时间</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="prompt in prompts"
            :key="prompt.id"
            class="border-t border-ink-100 hover:bg-ink-50/60"
          >
            <td class="px-4 py-3">
              <NuxtLink :to="`/prompts/${prompt.id}`" class="font-medium hover:text-accent-600">
                {{ prompt.name }}
              </NuxtLink>
              <p class="mt-0.5 font-mono text-xs text-ink-400">{{ prompt.key }}</p>
            </td>
            <td class="px-4 py-3 text-ink-600">{{ prompt.categoryName }}</td>
            <td class="px-4 py-3">
              <span v-if="prompt.currentVersion" class="badge bg-emerald-50 text-emerald-700">
                v{{ prompt.currentVersion }}
              </span>
              <span v-else class="badge bg-ink-100 text-ink-400">未发布</span>
              <span v-if="prompt.hasDraft" class="badge ml-1 bg-amber-50 text-amber-700">有草稿</span>
            </td>
            <td class="px-4 py-3 text-right tabular-nums">{{ formatNumber(prompt.usageCount) }}</td>
            <td class="px-4 py-3 text-ink-400">{{ formatDate(prompt.updatedAt) }}</td>
          </tr>
          <tr v-if="prompts.length === 0">
            <td colspan="5" class="px-4 py-12 text-center text-sm text-ink-400">
              没有匹配的 Prompt,换个条件或者新建一个
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
