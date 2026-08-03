import { createMiddleware } from 'hono/factory'
import type { Session } from 'hono-sessions'
import type { SessionDataTypes } from './session'

const PUBLIC_PATH_PREFIXES = ['/healthcheck', '/monthly-py/auth']

export const authRequired = createMiddleware<{
  Variables: { session: Session<SessionDataTypes> }
}>(async (c, next) => {
  if (PUBLIC_PATH_PREFIXES.some((p) => c.req.path.startsWith(p))) {
    await next()
    return
  }

  const userId = c.get('session').get('userId')
  if (userId === null) {
    const accept = c.req.header('accept') ?? ''
    if (accept.includes('text/html')) {
      return c.redirect('/monthly-py/auth/signin/')
    }
    return c.json({ status: 'error', message: 'unauthenticated' }, 401)
  }
  await next()
})
