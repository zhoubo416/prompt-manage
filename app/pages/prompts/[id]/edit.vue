<script setup lang="ts">
import type { PromptEditorPayload } from '~/components/PromptEditor.vue'

const route = useRoute()
const id = route.params.id as string

const { data: promptData } = await useFetch(`/api/prompts/${id}`)
const { data: categoryData } = await useFetch('/api/categories')

const categories = computed(() => (categoryData.value?.categories ?? []).map(item => ({ id: item.id, name: item.name })))

const draftSource = computed(() => {
  const versions = promptData.value?.versions ?? []
  const draft = versions.find(item => item.status === 'draft')
  const base = draft ?? versions.find(item => item.status === 'published') ?? versions[0]
  const prompt = promptData.value?.prompt
  if (!base || !prompt) {
    return undefined
  }
  return {
    name: prompt.name,
    key: prompt.key,
    categoryId: prompt.categoryId,
    description: prompt.description,
    content: base.content,
    variables: base.variables.map(variable => ({
      name: variable.name,
      required: variable.required,
      description: variable.description,
    })),
  }
})

const busy = ref(false)
const message = ref('')

async function submit(payload: PromptEditorPayload, publish: boolean) {
  busy.value = true
  message.value = ''
  try {
    await $fetch(`/api/prompts/${id}`, {
      method: 'PATCH',
      body: {
        name: payload.name,
        key: payload.key,
        categoryId: payload.categoryId,
        description: payload.description,
      },
    })
    await $fetch(`/api/prompts/${id}/versions`, {
      method: 'POST',
      body: { content: payload.content, variables: payload.variables, publish },
    })
    await navigateTo(`/prompts/${id}`)
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
      <h1 class="text-lg font-semibold">编辑 Prompt</h1>
      <NuxtLink :to="`/prompts/${id}`" class="text-sm text-ink-400 hover:text-ink-800">返回详情</NuxtLink>
    </div>
    <p v-if="message" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ message }}</p>
    <p class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
      保存不会覆盖已发布的版本,会生成一个草稿版本;点「发布」后它才成为对外提供的版本
    </p>
    <PromptEditor
      v-if="draftSource"
      :initial="draftSource"
      :categories="categories"
      :busy="busy"
      @submit="submit"
    />
  </div>
</template>
