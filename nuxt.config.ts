import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-09-22',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  nitro: {
    // 对外接口的错误结构要稳定,默认响应会把堆栈和本机路径带出去
    errorHandler: './server/error-handler.ts',
  },
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    head: {
      title: 'Prompt 管理系统',
      htmlAttrs: { lang: 'zh-CN' },
    },
  },
})
