import type { FC, Child } from 'hono/jsx'
import { tenantListHref } from '../types'

type LayoutProps = {
  title?: string
  lang?: string
  theme?: string
  backHref?: string
  backLabel?: string
  currentUsername?: string
  periodNav?: { prevHref: string; nextHref: string }
  children?: Child
}

export const Layout: FC<LayoutProps> = ({
  title = 'Monthly Py',
  lang = 'es',
  theme = 'corporate',
  backHref,
  backLabel = 'Volver',
  currentUsername,
  periodNav,
  children,
}) => {
  const today = new Date()
  const homePeriod = {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  }
  const homeHref = tenantListHref(homePeriod)

  return (
    <html lang={lang} data-theme={theme}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet" type="text/css" />
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        <link href="https://cdn.jsdelivr.net/npm/daisyui@5/themes.css" rel="stylesheet" type="text/css" />
      </head>
      <body class="min-h-screen bg-base-200 p-3 sm:p-4">
        <header class="navbar bg-base-100 shadow-sm rounded-box mb-2 px-4">
          <div class="flex-1">
            <a href={homeHref} class="btn btn-ghost text-base font-semibold normal-case">Monthly Py</a>
          </div>
          <div class="flex-none flex items-center gap-2">
            {currentUsername && (
              <span class="badge badge-ghost badge-sm">{currentUsername}</span>
            )}
            {currentUsername && (
              <form method="post" action="/monthly-py/auth/signout/" class="inline">
                <button class="btn btn-ghost btn-sm" type="submit">Salir</button>
              </form>
            )}
          </div>
        </header>

        {(backHref || periodNav) && (
          <nav class="flex items-center justify-end gap-2 mb-4 px-2">
            {backHref && (
              <a href={backHref} class="btn btn-sm btn-ghost">← {backLabel}</a>
            )}
            {periodNav && (
              <>
                <a href={periodNav.prevHref} class="btn btn-sm btn-ghost">← Mes anterior</a>
                <a href={periodNav.nextHref} class="btn btn-sm btn-ghost">Mes siguiente →</a>
              </>
            )}
          </nav>
        )}

        <main>{children}</main>
      </body>
    </html>
  )
}
