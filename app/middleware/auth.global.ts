export default defineNuxtRouteMiddleware(async (to) => {
  const session = await loadSession()

  if (to.path === '/login') {
    return session.authenticated ? navigateTo('/prompts') : undefined
  }
  if (!session.authenticated) {
    return navigateTo('/login')
  }
})
