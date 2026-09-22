<script setup lang="ts">
definePageMeta({ layout: false })

const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const tenantName = ref('')
const pending = ref(false)
const message = ref('')

async function submit() {
  pending.value = true
  message.value = ''
  try {
    if (mode.value === 'login') {
      await $fetch('/api/auth/login', {
        method: 'POST',
        body: { email: email.value, password: password.value },
      })
    } else {
      await $fetch('/api/auth/register', {
        method: 'POST',
        body: {
          email: email.value,
          password: password.value,
          tenantName: tenantName.value || undefined,
        },
      })
    }
    await loadSession(true)
    await navigateTo('/prompts')
  } catch (error) {
    message.value = errorMessage(error)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-ink-900 px-4">
    <div class="w-full max-w-sm">
      <div class="mb-6 text-center">
        <h1 class="text-xl font-semibold text-white">Prompt 管理系统</h1>
        <p class="mt-1 text-sm text-ink-400">把 Prompt 当成配置资产管理起来</p>
      </div>

      <form class="card space-y-4 p-6" @submit.prevent="submit">
        <div class="flex rounded-lg bg-ink-50 p-1 text-sm">
          <button
            type="button"
            class="flex-1 rounded-md py-1.5 transition"
            :class="mode === 'login' ? 'bg-white font-medium shadow-sm' : 'text-ink-400'"
            @click="mode = 'login'"
          >
            登录
          </button>
          <button
            type="button"
            class="flex-1 rounded-md py-1.5 transition"
            :class="mode === 'register' ? 'bg-white font-medium shadow-sm' : 'text-ink-400'"
            @click="mode = 'register'"
          >
            注册
          </button>
        </div>

        <label class="block">
          <span class="mb-1.5 block text-sm text-ink-600">邮箱</span>
          <input v-model="email" type="email" required class="field" placeholder="you@example.com">
        </label>

        <label class="block">
          <span class="mb-1.5 block text-sm text-ink-600">密码</span>
          <input v-model="password" type="password" required minlength="8" class="field" placeholder="至少 8 位">
        </label>

        <label v-if="mode === 'register'" class="block">
          <span class="mb-1.5 block text-sm text-ink-600">租户名称</span>
          <input v-model="tenantName" class="field" placeholder="留空则使用「个人空间」">
        </label>

        <p v-if="message" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {{ message }}
        </p>

        <button type="submit" class="btn-primary w-full" :disabled="pending">
          {{ pending ? '处理中…' : mode === 'login' ? '登录' : '注册并创建租户' }}
        </button>

        <p class="text-center text-xs text-ink-400">
          演示账号 demo@example.com / demo1234
        </p>
      </form>
    </div>
  </div>
</template>
