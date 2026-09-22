<script setup lang="ts">
const session = useSessionState()
const route = useRoute()

const navItems = computed(() => {
  const items = [
    { to: '/prompts', label: 'Prompt', icon: 'M4 6h16M4 12h16M4 18h10' },
    { to: '/categories', label: '分类', icon: 'M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z' },
    { to: '/analytics', label: 'Analytics', icon: 'M5 19V9M12 19V5M19 19v-7' },
  ]
  if (session.value?.role !== 'member') {
    items.splice(2, 0, { to: '/api-keys', label: 'API Keys', icon: 'M14 7a4 4 0 1 1-3.6 5.7L4 19v-3h3v-3h3l2.4-2.4A4 4 0 0 1 14 7z' })
  }
  return items
})

const activePath = computed(() => `/${route.path.split('/')[1] ?? ''}`)

async function switchTenant(tenantId: string) {
  if (tenantId === session.value?.tenant?.id) {
    return
  }
  await $fetch('/api/auth/tenant', { method: 'POST', body: { tenantId } })
  await loadSession(true)
  await refreshNuxtData()
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await loadSession(true)
  await navigateTo('/login')
}
</script>

<template>
  <div class="flex min-h-screen">
    <aside class="hidden w-56 shrink-0 border-r border-ink-200 bg-white p-4 md:block">
      <div class="px-2 py-3">
        <p class="text-sm font-semibold tracking-wide text-ink-900">Prompt 管理系统</p>
        <p class="mt-0.5 text-xs text-ink-400">{{ session?.tenant?.name }}</p>
      </div>
      <nav class="mt-4 space-y-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition"
          :class="activePath === item.to
            ? 'bg-accent-500/10 font-medium text-accent-600'
            : 'text-ink-600 hover:bg-ink-50'"
        >
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path :d="item.icon" />
          </svg>
          {{ item.label }}
        </NuxtLink>
      </nav>
      <div class="mt-6 border-t border-ink-100 pt-3">
        <a
          href="/docs"
          target="_blank"
          rel="noopener"
          class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-600 transition hover:bg-ink-50"
        >
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 6.5A5.5 5.5 0 0 1 17.5 12M6.5 12A5.5 5.5 0 0 1 12 6.5M12 17.5A5.5 5.5 0 0 1 6.5 12M17.5 12A5.5 5.5 0 0 1 12 17.5" />
          </svg>
          接口文档
        </a>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex items-center justify-between gap-4 border-b border-ink-200 bg-white/80 px-6 py-3 backdrop-blur">
        <div class="flex items-center gap-3">
          <span class="text-sm text-ink-400 md:hidden">Prompt 管理系统</span>
          <select
            v-if="(session?.tenants?.length ?? 0) > 1"
            class="rounded-lg border border-ink-200 bg-white px-2 py-1 text-sm"
            :value="session?.tenant?.id"
            @change="switchTenant(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="tenant in session?.tenants" :key="tenant.id" :value="tenant.id">
              {{ tenant.name }}
            </option>
          </select>
        </div>
        <div class="flex items-center gap-3 text-sm">
          <span class="text-ink-600">{{ session?.email }}</span>
          <span class="badge bg-ink-100 text-ink-600">{{ session?.role }}</span>
          <button class="text-ink-400 hover:text-ink-800" @click="logout">
            退出
          </button>
        </div>
      </header>

      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
