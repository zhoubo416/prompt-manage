<script setup lang="ts">
const { data, refresh } = await useFetch('/api/categories')
const categories = computed(() => data.value?.categories ?? [])

const name = ref('')
const description = ref('')
const message = ref('')
const busy = ref(false)

const editingId = ref<string | null>(null)
const editingName = ref('')
const editingDescription = ref('')

const deleting = ref<{ id: string, name: string, promptCount: number } | null>(null)
const moveToCategoryId = ref('')

async function create() {
  busy.value = true
  message.value = ''
  try {
    await $fetch('/api/categories', {
      method: 'POST',
      body: { name: name.value, description: description.value },
    })
    name.value = ''
    description.value = ''
    await refresh()
  } catch (error) {
    message.value = errorMessage(error)
  } finally {
    busy.value = false
  }
}

function startEdit(category: { id: string, name: string, description: string }) {
  editingId.value = category.id
  editingName.value = category.name
  editingDescription.value = category.description
}

async function saveEdit() {
  if (!editingId.value) {
    return
  }
  busy.value = true
  message.value = ''
  try {
    await $fetch(`/api/categories/${editingId.value}`, {
      method: 'PATCH',
      body: { name: editingName.value, description: editingDescription.value },
    })
    editingId.value = null
    await refresh()
  } catch (error) {
    message.value = errorMessage(error)
  } finally {
    busy.value = false
  }
}

async function move(index: number, delta: number) {
  const target = index + delta
  const list = [...categories.value]
  const [item] = list.splice(index, 1)
  if (!item) {
    return
  }
  list.splice(target, 0, item)
  busy.value = true
  try {
    await $fetch('/api/categories/reorder', {
      method: 'POST',
      body: { ids: list.map(category => category.id) },
    })
    await refresh()
  } catch (error) {
    message.value = errorMessage(error)
  } finally {
    busy.value = false
  }
}

function startDelete(category: { id: string, name: string, promptCount: number }) {
  deleting.value = category
  moveToCategoryId.value = categories.value.find(item => item.id !== category.id)?.id ?? ''
}

async function confirmDelete() {
  if (!deleting.value) {
    return
  }
  busy.value = true
  message.value = ''
  try {
    await $fetch(`/api/categories/${deleting.value.id}`, {
      method: 'DELETE',
      body: { moveToCategoryId: moveToCategoryId.value || null },
    })
    deleting.value = null
    await refresh()
  } catch (error) {
    message.value = errorMessage(error)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-lg font-semibold">分类</h1>
      <p class="text-sm text-ink-400">第一版只支持一级分类,分类下还有 Prompt 时不能直接删除</p>
    </div>

    <p v-if="message" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ message }}</p>

    <section class="card p-5">
      <h2 class="text-sm font-semibold text-ink-800">新建分类</h2>
      <div class="mt-3 flex flex-wrap gap-3">
        <input v-model="name" class="field w-48" placeholder="分类名称">
        <input v-model="description" class="field flex-1" placeholder="说明,可留空">
        <button class="btn-primary" :disabled="busy || !name.trim()" @click="create">添加</button>
      </div>
    </section>

    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-ink-50 text-left text-xs text-ink-400">
          <tr>
            <th class="px-4 py-2.5 font-medium">名称</th>
            <th class="px-4 py-2.5 font-medium">说明</th>
            <th class="px-4 py-2.5 text-right font-medium">Prompt 数</th>
            <th class="px-4 py-2.5 text-right font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(category, index) in categories" :key="category.id" class="border-t border-ink-100">
            <template v-if="editingId === category.id">
              <td class="px-4 py-2">
                <input v-model="editingName" class="field">
              </td>
              <td class="px-4 py-2">
                <input v-model="editingDescription" class="field">
              </td>
              <td class="px-4 py-2 text-right tabular-nums text-ink-400">{{ category.promptCount }}</td>
              <td class="px-4 py-2 text-right">
                <button class="text-accent-600" :disabled="busy" @click="saveEdit">保存</button>
                <button class="ml-3 text-ink-400" @click="editingId = null">取消</button>
              </td>
            </template>
            <template v-else>
              <td class="px-4 py-3 font-medium">{{ category.name }}</td>
              <td class="px-4 py-3 text-ink-600">{{ category.description || '-' }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ category.promptCount }}</td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <button class="text-ink-400 hover:text-ink-800" :disabled="index === 0" @click="move(index, -1)">上移</button>
                <button class="ml-3 text-ink-400 hover:text-ink-800" :disabled="index === categories.length - 1" @click="move(index, 1)">下移</button>
                <button class="ml-3 text-ink-600 hover:text-ink-900" @click="startEdit(category)">改名</button>
                <button class="ml-3 text-red-600 hover:text-red-500" @click="startDelete(category)">删除</button>
              </td>
            </template>
          </tr>
          <tr v-if="categories.length === 0">
            <td colspan="4" class="px-4 py-10 text-center text-sm text-ink-400">
              还没有分类,先建一个再来创建 Prompt
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="deleting" class="fixed inset-0 z-20 flex items-center justify-center bg-ink-900/40 px-4">
      <div class="card w-full max-w-md p-5">
        <h3 class="text-base font-semibold">删除「{{ deleting.name }}」分类</h3>
        <template v-if="deleting.promptCount > 0">
          <p class="mt-2 text-sm text-ink-600">
            该分类下有 {{ deleting.promptCount }} 个 Prompt,先把它们迁移到其他分类再删除。
          </p>
          <label class="mt-4 block">
            <span class="mb-1.5 block text-sm text-ink-600">迁移到</span>
            <select v-model="moveToCategoryId" class="field">
              <option v-for="category in categories.filter(item => item.id !== deleting?.id)" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </label>
        </template>
        <p v-else class="mt-2 text-sm text-ink-600">这个分类下没有 Prompt,可以直接删除。</p>
        <div class="mt-5 flex justify-end gap-2">
          <button class="btn-ghost" @click="deleting = null">取消</button>
          <button class="btn-primary" :disabled="busy" @click="confirmDelete">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>
