import { Hono, Context } from 'hono'
import { db } from '../../db'
import { hash_password, find_user_by_username } from '../auth'
import { currentPeriodTenantListHref } from '../../types'
import type { AppEnv } from '../../middleware/session'

export const o365_router = new Hono<{ Variables: AppEnv['Variables'] }>()
  .get('/signin/', o365_signin_get)
  .post('/validate/', o365_validate_post)

type O365Config = {
  clientId: string
  clientSecret: string
  tenantId: string
}

function load_o365_config(): O365Config | null {
  const clientId = process.env.MONTHLY_PY_O365_CLIENT_ID
  const clientSecret = process.env.MONTHLY_PY_O365_CLIENT_SECRET
  const tenantId = process.env.MONTHLY_PY_O365_TENANT_ID
  if (!clientId || !clientSecret || !tenantId) return null
  return { clientId, clientSecret, tenantId }
}

function jwt_string_claim(token: string, claim: string): string | null {
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'))
    const value = json[claim]
    return typeof value === 'string' ? value : null
  } catch {
    return null
  }
}

async function provision_user(username: string): Promise<void> {
  const randomPassword = crypto.randomUUID() + crypto.randomUUID()
  const hashed = await hash_password(randomPassword)
  const query = `insert into user (username, password) values ($username, $password)`
  db.query(query).run({ $username: username, $password: hashed })
}

async function o365_signin_get(c: Context<{ Variables: AppEnv['Variables'] }>) {
  if (c.get('session').get('userId')) {
    return c.redirect(currentPeriodTenantListHref())
  }

  const config = load_o365_config()
  if (!config) {
    return c.html(
      <O365SigninPage error="El inicio de sesión con Office 365 no está configurado en este servidor." />
    )
  }

  let response: Response
  try {
    response = await fetch(
      `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/devicecode`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: config.clientId, scope: 'openid profile User.Read' }),
      }
    )
  } catch {
    return c.html(<O365SigninPage error="No se pudo conectar con Microsoft. Intenta de nuevo." />)
  }

  if (!response.ok) {
    return c.html(<O365SigninPage error="Microsoft devolvió un error. Intenta de nuevo." />)
  }

  let data: { user_code?: string; verification_uri?: string; device_code?: string }
  try {
    data = await response.json()
  } catch {
    return c.html(<O365SigninPage error="Respuesta inesperada de Microsoft." />)
  }

  if (!data.user_code || !data.verification_uri || !data.device_code) {
    return c.html(<O365SigninPage error="Respuesta inesperada de Microsoft." />)
  }

  return c.html(
    <O365SigninPage
      userCode={data.user_code}
      verificationUri={data.verification_uri}
      deviceCode={data.device_code}
    />
  )
}

async function o365_validate_post(c: Context<{ Variables: AppEnv['Variables'] }>) {
  const formData = await c.req.formData()
  const deviceCode = String(formData.get('device_code') ?? '')

  if (!deviceCode) {
    return c.json({ status: 'error', message: 'Falta device_code' }, 400)
  }

  const config = load_o365_config()
  if (!config) {
    return c.json({ status: 'error', message: 'El inicio de sesión con Office 365 no está configurado' }, 500)
  }

  let response: Response
  try {
    response = await fetch(
      `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: deviceCode,
        }),
      }
    )
  } catch {
    return c.json({ status: 'error', message: 'No se pudo conectar con Microsoft' })
  }

  let data: Record<string, unknown>
  try {
    data = await response.json()
  } catch {
    return c.json({ status: 'error', message: 'Respuesta inesperada de Microsoft' })
  }

  if (typeof data.error === 'string') {
    if (data.error === 'authorization_pending' || data.error === 'slow_down') {
      return c.json({ status: 'pending' })
    }
    return c.json({ status: 'error', message: `Error de inicio de sesión: ${data.error}` })
  }

  const tokenForClaims = (data.id_token as string | undefined) ?? (data.access_token as string | undefined)
  if (!tokenForClaims) {
    return c.json({ status: 'pending' })
  }

  const username = jwt_string_claim(tokenForClaims, 'preferred_username') ?? jwt_string_claim(tokenForClaims, 'upn')
  if (!username) {
    return c.json({ status: 'error', message: 'No se pudo determinar tu identidad' })
  }

  if (!find_user_by_username(username)) {
    try {
      await provision_user(username)
    } catch {
      return c.json({ status: 'error', message: 'No se pudo crear tu cuenta' })
    }
  }

  const user = find_user_by_username(username)
  if (!user) {
    return c.json({ status: 'error', message: 'No se pudo cargar tu cuenta' })
  }

  const session = c.get('session')
  session.set('userId', user.id)
  session.set('username', user.username)

  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  return c.json({ status: 'ok', redirect: currentPeriodTenantListHref() })
}

const O365_POLL_SCRIPT = `
document.addEventListener('DOMContentLoaded', function () {
  var raw = document.getElementById('device-code-raw');
  if (!raw) return;

  var deviceCode = raw.dataset.code;
  var statusEl = document.getElementById('poll-status');
  var timeoutEl = document.getElementById('poll-timeout');
  var timeoutMessage = document.getElementById('poll-timeout-message');
  var deadline = Date.now() + 60000;
  var timer;

  function stop(timedOut) {
    clearInterval(timer);
    statusEl.classList.add('hidden');
    if (timedOut) timeoutEl.classList.remove('hidden');
  }

  function poll() {
    if (Date.now() >= deadline) { stop(true); return; }

    fetch('/monthly-py/auth/o365/validate/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'device_code=' + encodeURIComponent(deviceCode),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.status === 'ok') {
          stop(false);
          window.location.href = data.redirect || '/';
        } else if (data.status === 'error') {
          stop(false);
          timeoutMessage.textContent = data.message || 'No se pudo iniciar sesión.';
          timeoutEl.classList.remove('hidden');
        }
      })
      .catch(function () {});
  }

  timer = setInterval(poll, 5000);
});

function copyDeviceCode() {
  var code = document.getElementById('device-code');
  if (!code) return;
  navigator.clipboard.writeText(code.textContent.trim());
}
`

type O365SigninPageProps = {
  error?: string
  userCode?: string
  verificationUri?: string
  deviceCode?: string
}

function O365SigninPage({ error, userCode, verificationUri, deviceCode }: O365SigninPageProps) {
  const hasCode = Boolean(userCode && verificationUri && deviceCode)

  return (
    <html lang="es" data-theme="light">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Monthly Py | Iniciar sesión con Office 365</title>
        <link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet" type="text/css" />
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        <link href="https://cdn.jsdelivr.net/npm/daisyui@5/themes.css" rel="stylesheet" type="text/css" />
        {hasCode && <script dangerouslySetInnerHTML={{ __html: O365_POLL_SCRIPT }} />}
      </head>
      <body class="min-h-screen bg-base-200">
        <main class="hero min-h-screen px-4 py-8">
          <div class="hero-content w-full max-w-lg flex-col">
            <div class="flex items-center gap-3 self-start">
              <div class="badge badge-primary badge-lg">Monthly Py</div>
              <div class="badge badge-outline">Office 365</div>
            </div>

            <div class="card w-full border border-base-300 bg-base-100 shadow-xl">
              <div class="card-body gap-6">
                <div class="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" class="h-8 w-8 shrink-0" aria-hidden="true">
                    <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                    <path fill="#f35325" d="M1 1h10v10H1z" />
                    <path fill="#81bc06" d="M12 1h10v10H12z" />
                    <path fill="#05a6f0" d="M1 12h10v10H1z" />
                    <path fill="#ffba08" d="M12 12h10v10H12z" />
                  </svg>
                  <h2 class="card-title text-2xl">Iniciar sesión con Office 365</h2>
                </div>

                {error && (
                  <div class="alert alert-error">
                    <span>{error}</span>
                  </div>
                )}

                {hasCode && (
                  <div class="contents">
                    <span id="device-code-raw" class="hidden" data-code={deviceCode}></span>
                    <div class="space-y-1 text-center">
                      <p class="text-sm opacity-70">Tu código de inicio de sesión</p>
                      <div class="rounded-xl border-2 border-primary bg-base-200 px-6 py-4 flex items-center justify-center gap-3">
                        <span id="device-code" class="font-mono text-4xl font-bold tracking-[0.25em] text-primary">{userCode}</span>
                        <button
                          type="button"
                          title="Copiar código"
                          onclick="copyDeviceCode()"
                          class="btn btn-ghost btn-sm btn-square text-primary opacity-60 hover:opacity-100"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                      <p class="text-xs opacity-50">Este código expira en unos minutos.</p>
                    </div>

                    <div class="divider my-0"></div>

                    <ol class="steps steps-vertical text-sm">
                      <li class="step step-primary">
                        <div class="ml-4 space-y-1 text-left">
                          <p class="font-semibold">Abre la página de inicio de sesión de Microsoft</p>
                          <p class="opacity-70">Visita el siguiente enlace; puede ser desde cualquier dispositivo o navegador.</p>
                        </div>
                      </li>
                      <li class="step">
                        <div class="ml-4 space-y-1 text-left">
                          <p class="font-semibold">Ingresa el código de arriba</p>
                          <p class="opacity-70">Escribe <strong class="font-mono">{userCode}</strong> cuando se te solicite, luego inicia sesión con tu cuenta de Office 365.</p>
                        </div>
                      </li>
                      <li class="step">
                        <div class="ml-4 space-y-1 text-left">
                          <p class="font-semibold">Vuelve aquí</p>
                          <p class="opacity-70">Una vez aprobado, esta página te llevará automáticamente a tu espacio de trabajo.</p>
                        </div>
                      </li>
                    </ol>

                    <a href={verificationUri} target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-block gap-2">
                      Abrir microsoft.com/devicelogin
                    </a>

                    <div class="alert alert-info text-xs">
                      <span>Microsoft verifica tus credenciales directamente; Monthly Py nunca ve tu contraseña.</span>
                    </div>

                    <div id="poll-status" class="flex items-center justify-center gap-2 text-sm opacity-60">
                      <span class="loading loading-dots loading-sm"></span>
                      <span>Esperando que inicies sesión...</span>
                    </div>

                    <div id="poll-timeout" class="alert alert-warning hidden text-sm">
                      <div>
                        <p id="poll-timeout-message">El código de inicio de sesión expiró.</p>
                        <a href="/monthly-py/auth/o365/signin/" class="link">Intenta de nuevo</a>.
                      </div>
                    </div>
                  </div>
                )}

                <a href="/monthly-py/auth/signin/" class="btn btn-ghost btn-sm">
                  ← Volver a iniciar sesión
                </a>
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
