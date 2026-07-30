import type { FC, Child } from 'hono/jsx'

type LayoutProps = {
  title?: string
  lang?: string
  theme?: string
  backHref?: string
  backLabel?: string
  children?: Child
}

export const Layout: FC<LayoutProps> = ({
  title = 'Monthly Py',
  lang = 'es',
  theme = 'corporate',
  backHref,
  backLabel = 'Volver',
  children,
}) => {
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
        <div class="navbar bg-base-100 shadow-sm rounded-box mb-4 px-4">
          <div class="flex-1 flex items-center gap-2">
            {backHref && (
              <a href={backHref} class="btn btn-sm btn-ghost">← {backLabel}</a>
            )}
            <a href="/year/2025/month/08/tenant/list/" class="btn btn-ghost text-base font-semibold normal-case">Monthly Py</a>
          </div>
          <div class="flex-none">
            <span class="badge badge-ghost badge-sm">Reportes de ventas</span>
          </div>
        </div>
        {children}
      </body>
    </html>
  )
}
