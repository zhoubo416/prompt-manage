export default defineEventHandler(async (event) => {
  const session = await readSession(event)
  if (!session) {
    return { authenticated: false }
  }
  const memberships = await listMemberships(session.accountId)
  return {
    authenticated: true,
    email: session.email,
    role: session.userRole,
    tenant: { id: session.tenantId, name: session.tenantName },
    tenants: memberships.map(row => ({ id: row.id, name: row.name, role: row.role })),
  }
})
