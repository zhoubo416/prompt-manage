/** 不需要登录就能访问的页面 */
const PUBLIC_PATHS = new Set(['/login', '/docs'])

export default defineNuxtRouteMiddleware(async (to) => {
  if (!PUBLIC_PATHS.has(to.path)) {
    const session = await loadSession()
    if (!session.authenticated) {
      return navigateTo('/login')
    }
    return
  }

  if (to.path === '/login') {
    const session = await loadSession()
    return session.authenticated ? navigateTo('/prompts') : undefined
  }
})
