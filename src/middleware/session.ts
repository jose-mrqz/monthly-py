import { sessionMiddleware } from 'hono-sessions'
import { BunSqliteStore } from 'hono-sessions/bun-sqlite-store'
import type { Session } from 'hono-sessions'
import { db } from '../db'

export type SessionDataTypes = {
  userId: number
  username: string
}

export type AppEnv = {
  Variables: {
    session: Session<SessionDataTypes>
  }
}

const encryptionKey = process.env.MONTHLY_PY_SESSION_ENCRYPTION_KEY
if (!encryptionKey || encryptionKey.length < 32) {
  throw new Error('MONTHLY_PY_SESSION_ENCRYPTION_KEY must be set to a string of at least 32 characters')
}

const store = new BunSqliteStore(db)

export const session = sessionMiddleware({
  store,
  encryptionKey,
  expireAfterSeconds: 60 * 60 * 8,
  autoExtendExpiration: true,
  cookieOptions: {
    sameSite: 'Lax',
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  },
})
