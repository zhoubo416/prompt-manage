<script setup lang="ts">
const range = ref<'today' | 'week' | 'month' | 'all'>('today')
const { data } = await useFetch('/api/analytics/summary', { query: { range } })

const totals = computed(() => data.value?.totals ?? { today: 0, week: 0, month: 0, total: 0 })
const ranking = computed(() => data.value?.ranking ?? [])
const maxCount = computed(() => Math.max(1, ...ranking.value.map(item => item.count)))

const ranges = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'all', label: '全部' },
] as const
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-lg font-semibold">Usage</h1>
      <p class="text-sm text-ink-400">API 成功返回 Prompt 记一次调用,按 Asia/Shanghai 的日、周、月切分</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="card p-4">
        <p class="text-xs text-ink-400">今日调用</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums">{{ formatNumber(totals.today) }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-ink-400">本周调用</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums">{{ formatNumber(totals.week) }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-ink-400">本月调用</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums">{{ formatNumber(totals.month) }}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-ink-400">总调用</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums">{{ formatNumber(totals.total) }}</p>
      </div>
    </div>

    <section class="card p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-sm font-semibold text-ink-800">Prompt 调用排行</h2>
        <div class="flex gap-1 rounded-lg bg-ink-50 p-1 text-sm">
          <button
            v-for="item in ranges"
            :key="item.value"
            class="rounded-md px-3 py-1 transition"
            :class="range === item.value ? 'bg-white font-medium shadow-sm' : 'text-ink-400'"
            @click="range = item.value"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <div class="mt-4 space-y-3">
        <div v-for="item in ranking" :key="item.id">
          <div class="flex items-center justify-between text-sm">
            <NuxtLink :to="`/prompts/${item.id}`" class="hover:text-accent-600">{{ item.name }}</NuxtLink>
            <span class="tabular-nums text-ink-600">{{ formatNumber(item.count) }}</span>
          </div>
          <div class="mt-1.5 h-1.5 rounded-full bg-ink-100">
            <div
              class="h-full rounded-full bg-accent-500"
              :style="{ width: `${Math.round((item.count / maxCount) * 100)}%` }"
            />
          </div>
        </div>
        <p v-if="ranking.length === 0" class="py-6 text-center text-sm text-ink-400">
          还没有 Prompt
        </p>
      </div>
    </section>
  </div>
</template>
