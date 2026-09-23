/**
 * /api/v1 下没有匹配到路由时的兜底。
 * 不加这个的话请求会继续走到页面渲染,给三方返回一段 HTML 或者跳转登录页,
 * 调用方很难判断到底哪里错了。兜底只放在对外接口这一层:
 * 放在 /api 根上会让 Nitro 生成的接口类型把 /api/prompts/{id} 这类路由盖掉,页面的类型推导会失效。
 */
export default defineEventHandler((event) => {
  const path = event.path.split('?')[0]
  apiError('not_found', `接口不存在:${path}`)
})
