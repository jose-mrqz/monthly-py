import { Hono, Context } from 'hono'
import { db } from '../db'
import { o365_router } from './auth/o365'

export const auth_router = new Hono()
  .get('/signin/', signin_get)
  .post('/signin/', signin_post)

auth_router.route('/o365', o365_router)

async function signin_get(c: Context) {
  const error = c.req.query('error')
  return c.html(<SigninPage error={error} />)
}

async function signin_post(c: Context) {
  const formData = await c.req.formData()
  const username = String(formData.get('username') ?? '').trim()
  const password = String(formData.get('password') ?? '').trim()

  if (!username || !password) {
    return c.html(
      <SigninPage error="Usuario y contraseña son obligatorios" username={username} />
    )
  }

  if (!(await authenticate(username, password))) {
    return c.html(
      <SigninPage error="Usuario o contraseña incorrectos" username={username} />
    )
  }

  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')

  return c.redirect(`/year/${year}/month/${month}/tenant/list/`)
}

type UserRow = {
  id: number
  username: string
  password: string
}

export async function hash_password(password: string): Promise<string> {
  return Bun.password.hash(password)
}

async function verify_password(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash)
}

export function find_user_by_username(username: string): UserRow | null {
  const query = `select id, username, password from user where username = $username limit 1`
  return db.query(query).get({ $username: username }) as UserRow | null
}

async function authenticate(username: string, password: string): Promise<boolean> {
  const user = find_user_by_username(username)
  if (!user) return false
  return verify_password(password, user.password)
}

// TODO: move this to state interaction of jsx.
const SIGNIN_SCRIPT = `
document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('signin-form');
  var submit = document.getElementById('signin-submit');
  var spinner = document.getElementById('signin-spinner');
  var label = document.getElementById('signin-submit-label');

  if (!form || !submit || !spinner || !label) return;

  function setLoading(loading) {
    submit.disabled = loading;
    submit.setAttribute('aria-busy', loading ? 'true' : 'false');
    spinner.classList.toggle('hidden', !loading);
    label.textContent = loading ? 'Ingresando...' : 'Iniciar sesión';
  }

  form.addEventListener('submit', function () {
    setLoading(true);
  });

  window.addEventListener('pageshow', function () {
    setLoading(false);
  });
});
`

type SigninPageProps = {
  error?: string
  username?: string
}

function SigninPage({ error, username }: SigninPageProps) {
  return (
    <html lang="es" data-theme="light">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Monthly Py | Iniciar sesión</title>
        <link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet" type="text/css" />
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        <link href="https://cdn.jsdelivr.net/npm/daisyui@5/themes.css" rel="stylesheet" type="text/css" />
        <script dangerouslySetInnerHTML={{ __html: SIGNIN_SCRIPT }} />
      </head>
      <body class="min-h-screen bg-base-200">
        <main class="hero min-h-screen px-4 py-8">
          <div class="hero-content w-full max-w-6xl">
            <div class="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
              <section class="order-2 space-y-6 lg:order-1">
                <div class="flex flex-wrap items-center gap-3">
                  <div class="badge badge-primary badge-lg">Monthly Py</div>
                  <div class="badge badge-outline">Reporte de ventas</div>
                </div>

                <div class="space-y-3">
                  <h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
                    Reporte de ventas de locales
                  </h1>
                  <p class="max-w-xl text-base leading-7 opacity-80 sm:text-lg">
                    Ingresa para registrar y revisar los reportes de ventas mensuales
                    y diarios de cada local del centro comercial.
                  </p>
                </div>

                <div class="stats stats-vertical shadow-sm lg:stats-horizontal">
                  <div class="stat">
                    <div class="stat-title">Reportes</div>
                    <div class="stat-value text-2xl">Mensual</div>
                    <div class="stat-desc">y diario por local</div>
                  </div>
                  <div class="stat">
                    <div class="stat-title">Locales</div>
                    <div class="stat-value text-2xl">Todos</div>
                    <div class="stat-desc">en un solo panel</div>
                  </div>
                  <div class="stat">
                    <div class="stat-title">Estado</div>
                    <div class="stat-value text-2xl">Activo</div>
                    <div class="stat-desc">centro comercial</div>
                  </div>
                </div>
              </section>

              <section class="card order-1 w-full border border-base-300 bg-base-100 shadow-xl lg:order-2">
                <div class="card-body gap-6">
                  <div class="space-y-2">
                    <h2 class="card-title text-2xl">Bienvenido</h2>
                    <p class="text-sm opacity-70">
                      Ingresa tus credenciales para continuar.
                    </p>
                    {error && (
                      <div class="alert alert-error">
                        <span>{error}</span>
                      </div>
                    )}
                  </div>

                  <form id="signin-form" method="post" class="space-y-4">
                    <label class="form-control w-full">
                      <div class="label">
                        <span class="label-text">Usuario</span>
                      </div>
                      <input
                        name="username"
                        autocomplete="username"
                        autocapitalize="none"
                        spellcheck={false}
                        class="input input-bordered w-full"
                        placeholder="tu.usuario"
                        value={username ?? ''}
                        required
                      />
                    </label>

                    <label class="form-control w-full">
                      <div class="label">
                        <span class="label-text">Contraseña</span>
                      </div>
                      <input
                        name="password"
                        type="password"
                        autocomplete="current-password"
                        class="input input-bordered w-full"
                        placeholder="••••••••"
                        required
                      />
                    </label>

                    <button id="signin-submit" type="submit" aria-busy="false" class="btn btn-primary btn-block mt-2">
                      <span id="signin-spinner" class="loading loading-spinner loading-sm hidden" aria-hidden="true"></span>
                      <span id="signin-submit-label">Iniciar sesión</span>
                    </button>
                  </form>

                  <div class="divider text-xs opacity-60">o</div>

                  <a href="/monthly-py/auth/o365/signin/" class="btn btn-outline btn-block gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" class="h-5 w-5" aria-hidden="true">
                      <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                      <path fill="#f35325" d="M1 1h10v10H1z" />
                      <path fill="#81bc06" d="M12 1h10v10H12z" />
                      <path fill="#05a6f0" d="M1 12h10v10H1z" />
                      <path fill="#ffba08" d="M12 12h10v10H12z" />
                    </svg>
                    Iniciar sesión con Office 365
                  </a>

                  <p class="text-center text-xs opacity-60">
                    Contacta a tu administrador si necesitas acceso.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
