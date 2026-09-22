<script setup lang="ts">
import { extractVariableNames, renderTemplate } from '#shared/template'

interface EditorVariable {
  name: string
  required: boolean
  description: string
}

export interface PromptEditorPayload {
  name: string
  key: string
  categoryId: string
  description: string
  content: string
  variables: EditorVariable[]
}

const props = defineProps<{
  categories: { id: string, name: string }[]
  initial?: {
    name: string
    key: string
    categoryId: string
    description: string
    content: string
    variables: EditorVariable[]
  }
  busy?: boolean
  keyLocked?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: PromptEditorPayload, publish: boolean]
}>()

const name = ref(props.initial?.name ?? '')
const key = ref(props.initial?.key ?? '')
const categoryId = ref(props.initial?.categoryId ?? props.categories[0]?.id ?? '')
const description = ref(props.initial?.description ?? '')
const content = ref(props.initial?.content ?? '')
const sampleValues = ref<Record<string, string>>({})

const meta = ref<Record<string, { required: boolean, description: string }>>(
  Object.fromEntries(
    (props.initial?.variables ?? []).map(item => [
      item.name,
      { required: item.required, description: item.description },
    ]),
  ),
)

const variables = computed<EditorVariable[]>(() =>
  extractVariableNames(content.value).map(variable => ({
    name: variable,
    required: meta.value[variable]?.required ?? true,
    description: meta.value[variable]?.description ?? '',
  })),
)

const preview = computed(() => renderTemplate(content.value, sampleValues.value))

const localError = ref('')
const placeholderHint = '{{变量名}}'

function submit(publish: boolean) {
  localError.value = ''
  if (!name.value.trim()) {
    localError.value = '请填写 Prompt 名称'
    return
  }
  if (!categoryId.value) {
    localError.value = '请选择分类'
    return
  }
  if (!content.value.trim()) {
    localError.value = '请填写 Prompt 正文'
    return
  }
  emit('submit', {
    name: name.value.trim(),
    key: key.value.trim(),
    categoryId: categoryId.value,
    description: description.value.trim(),
    content: content.value,
    variables: variables.value,
  }, publish)
}
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
    <div class="space-y-6">
      <section class="card p-5">
        <h2 class="text-sm font-semibold text-ink-800">基本信息</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-sm text-ink-600">名称</span>
            <input v-model="name" class="field" placeholder="客户信息分析">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-sm text-ink-600">分类</span>
            <select v-model="categoryId" class="field">
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </label>
          <label class="block sm:col-span-2">
            <span class="mb-1.5 block text-sm text-ink-600">Key</span>
            <input
              v-model="key"
              class="field font-mono"
              placeholder="customer-analysis"
              :disabled="keyLocked"
            >
            <span class="mt-1 block text-xs text-ink-400">
              小写字母、数字和连字符。Key 是对外调用地址的一部分,改动会影响已经接入的业务系统
            </span>
          </label>
          <label class="block sm:col-span-2">
            <span class="mb-1.5 block text-sm text-ink-600">描述</span>
            <input v-model="description" class="field" placeholder="分析客户资料,提取客户需求和潜在风险">
          </label>
        </div>
      </section>

      <section class="card p-5">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-ink-800">Prompt 正文</h2>
          <span class="text-xs text-ink-400">用 {{ placeholderHint }} 占位</span>
        </div>
        <textarea
          v-model="content"
          rows="14"
          class="field mt-3 font-mono text-[13px] leading-6"
          placeholder="你是一名专业的客户分析助手。&#10;&#10;请分析以下客户信息:&#10;&#10;{{customer_info}}"
        />
      </section>

      <section class="card p-5">
        <h2 class="text-sm font-semibold text-ink-800">变量</h2>
        <p class="mt-1 text-xs text-ink-400">从正文的 {{ placeholderHint }} 自动识别,第一版只支持 Text 类型</p>
        <div v-if="variables.length === 0" class="mt-3 text-sm text-ink-400">
          正文里还没有变量
        </div>
        <div v-else class="mt-3 space-y-3">
          <div
            v-for="variable in variables"
            :key="variable.name"
            class="grid items-center gap-3 rounded-lg border border-ink-200 p-3 sm:grid-cols-[180px_90px_1fr]"
          >
            <code class="text-sm text-ink-800">{{ variable.name }}</code>
            <label class="flex items-center gap-2 text-sm text-ink-600">
              <input
                type="checkbox"
                :checked="variable.required"
                @change="meta[variable.name] = {
                  required: ($event.target as HTMLInputElement).checked,
                  description: variable.description,
                }"
              >
              必填
            </label>
            <input
              :value="variable.description"
              class="field"
              placeholder="说明,可留空"
              @input="meta[variable.name] = {
                required: variable.required,
                description: ($event.target as HTMLInputElement).value,
              }"
            >
          </div>
        </div>
      </section>
    </div>

    <div class="space-y-6">
      <section class="card p-5">
        <h2 class="text-sm font-semibold text-ink-800">模板预览</h2>
        <p class="mt-1 text-xs text-ink-400">填入样例值,检查变量替换是否正确,第一版不调用大模型</p>
        <div class="mt-3 space-y-2">
          <label v-for="variable in variables" :key="variable.name" class="block">
            <span class="mb-1 block text-xs text-ink-600">{{ variable.name }}</span>
            <input v-model="sampleValues[variable.name]" class="field text-sm" :placeholder="`${variable.name} 的样例值`">
          </label>
        </div>
        <pre class="mt-4 max-h-72 overflow-auto rounded-lg bg-ink-900 p-3 text-xs leading-5 text-ink-100 whitespace-pre-wrap">{{ preview || '正文为空' }}</pre>
      </section>

      <section class="card space-y-3 p-5">
        <p v-if="localError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {{ localError }}
        </p>
        <button class="btn-ghost w-full" :disabled="busy" @click="submit(false)">
          保存草稿
        </button>
        <button class="btn-primary w-full" :disabled="busy" @click="submit(true)">
          发布
        </button>
        <p class="text-xs text-ink-400">
          发布后这个版本会通过 API 对外提供,原来的发布版本转为历史版本
        </p>
      </section>
    </div>
  </div>
</template>
