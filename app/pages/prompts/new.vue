<script setup lang="ts">
import type { PromptEditorPayload } from '~/components/PromptEditor.vue'

const { data } = await useFetch('/api/categories')
const categories = computed(() => (data.value?.categories ?? []).map(item => ({ id: item.id, name: item.name })))

const busy = ref(false)
const message = ref('')

async function submit(payload: PromptEditorPayload, publish: boolean) {
  busy.value = true
  message.value = ''
  try {
    const created = await $fetch<{ id: string }>('/api/prompts', {
      method: 'POST',
      body: { ...payload, publish },
    })
    await navigateTo(`/prompts/${created.id}`)
  } catch (error) {
    message.value = errorMessage(error)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-semibold">新建 Prompt</h1>
      <NuxtLink to="/prompts" class="text-sm text-ink-400 hover:text-ink-800">返回列表</NuxtLink>
    </div>
    <p v-if="message" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ message }}</p>
    <PromptEditor :categories="categories" :busy="busy" @submit="submit" />
  </div>
</template>
