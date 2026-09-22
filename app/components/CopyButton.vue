<script setup lang="ts">
const props = defineProps<{ text: string }>()
const copied = ref(false)

async function copy() {
  try {
    await navigator.clipboard.writeText(props.text)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <button
    type="button"
    class="rounded-md border border-ink-200 px-2 py-0.5 text-xs text-ink-600 hover:bg-ink-50"
    @click="copy"
  >
    {{ copied ? '已复制' : '复制' }}
  </button>
</template>
