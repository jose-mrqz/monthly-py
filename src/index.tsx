import { Hono } from 'hono'
import { jsx } from 'hono/jsx'
import { Layout } from './components/Layout'
import { TenantService } from './services/tenant.service'
import { TenantRow } from './components/TenantRow';
import { MonthlySaleForm } from './components/MonthlySaleForm';
import { MonthlyAmountOnlyForm } from './components/MonthlyAmountOnlyForm';
import { MonthlyWithModulesForm } from './components/MonthlyWithModulesForm';
import { MonthlyDailyForm, MonthlyDailyFormValues } from './components/MonthlyDailyForm';
import { createPeriod, Period, ReportKind, Tenant } from './types'
import {
  parseMonthlySaleForm,
  parseMonthlyAmountOnlyForm,
  parseMonthlyWithModulesForm,
  parseMonthlyDailyForm,
  FieldErrors,
  ParseResult,
} from './forms/sales-report'
import { SaleService } from './services/monthly-sale.service'
import { SaleInput } from './types'

import { auth_router } from './handlers/auth'

const app = new Hono()


app.route('/monthly-py/auth', auth_router)


app.get('/', (c) => {
  return c.redirect('/monthly-py/auth/signin/');
});


app.get('/healthcheck/', (c) => {
  return c.json({ status: 'ok', message: 'cheers 🍻' })
})


app.get('/year/:year/month/:month/tenant/list/', async (c) => {
  const { year, month } = c.req.param()
  const period = createPeriod(Number(month), Number(year))
  const tenants = TenantService.listTenants()
  return c.html(
    <Layout>
      <div class="mx-auto max-w-7xl">
        <div class="mb-4">
          <h1 class="text-2xl font-semibold">Locales — {period.month}/{period.year}</h1>
          <p class="mt-1 text-sm opacity-60">Selecciona un local para registrar o editar su reporte de ventas</p>
        </div>
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body gap-3 p-4">
            <div class="overflow-x-auto">
              <table class="table table-sm table-zebra">
                <thead>
                  <tr>
                    <th class="text-xs uppercase tracking-wide opacity-70 font-semibold">Razón Social</th>
                    <th class="text-xs uppercase tracking-wide opacity-70 font-semibold">RUC</th>
                    <th class="text-xs uppercase tracking-wide opacity-70 font-semibold">Nombre Comercial</th>
                    <th class="text-xs uppercase tracking-wide opacity-70 font-semibold">Ubicación</th>
                    <th class="text-right text-xs uppercase tracking-wide opacity-70 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <TenantRow tenant={tenant} url={`/year/${period.year}/month/${period.month}/tenant/${tenant.id}/sales-report/create/`}></TenantRow>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
})


const daysInPeriod = (period: Period): number => {
  return new Date(period.year, period.month, 0).getDate()
}


const emptyDailyValues = (period: Period): MonthlyDailyFormValues => {
  const total = daysInPeriod(period)
  const values: MonthlyDailyFormValues = {}
  for (let n = 1; n <= total; n++) {
    values[n] = { amount: '', transactions: '' }
  }
  return values
}


const dailyValuesFromFormData = (formData: FormData, period: Period): MonthlyDailyFormValues => {
  const total = daysInPeriod(period)
  const values: MonthlyDailyFormValues = {}
  for (let n = 1; n <= total; n++) {
    values[n] = {
      amount: formData.get(`days[${n}].amount`)?.toString() ?? '',
      transactions: formData.get(`days[${n}].transactions`)?.toString() ?? '',
    }
  }
  return values
}


const renderFormForKind = (
  kind: ReportKind,
  url: string,
  period: Period,
  values: Record<string, string> | MonthlyDailyFormValues,
  errors: FieldErrors,
): any => {
  switch (kind) {
    case ReportKind.Monthly:
      return (
        <MonthlySaleForm
          url={url}
          values={{
            amount: (values as any).amount ?? '',
            transactions: (values as any).transactions ?? '',
          }}
          errors={errors as any}
        />
      )
    case ReportKind.MonthlyAmountOnly:
      return (
        <MonthlyAmountOnlyForm
          url={url}
          values={{ amount: (values as any).amount ?? '' }}
          errors={errors as any}
        />
      )
    case ReportKind.MonthlyWithModules:
      return (
        <MonthlyWithModulesForm
          url={url}
          values={{
            amount: (values as any).amount ?? '',
            transactions: (values as any).transactions ?? '',
            modulesAmount: (values as any).modulesAmount ?? '',
            modulesTransactions: (values as any).modulesTransactions ?? '',
          }}
          errors={errors as any}
        />
      )
    case ReportKind.MonthlyDaily:
      return (
        <MonthlyDailyForm
          url={url}
          daysInPeriod={daysInPeriod(period)}
          values={values as MonthlyDailyFormValues}
          errors={errors as any}
        />
      )
  }
}


const emptyValuesFor = (kind: ReportKind, period: Period): Record<string, string> | MonthlyDailyFormValues => {
  if (kind === ReportKind.MonthlyDaily) {
    return emptyDailyValues(period)
  }
  if (kind === ReportKind.MonthlyWithModules) {
    return { amount: '', transactions: '', modulesAmount: '', modulesTransactions: '' }
  }
  if (kind === ReportKind.MonthlyAmountOnly) {
    return { amount: '' }
  }
  return { amount: '', transactions: '' }
}


const valuesFromExisting = (
  existing: SaleInput,
  period: Period,
): Record<string, string> | MonthlyDailyFormValues => {
  switch (existing.kind) {
    case ReportKind.Monthly:
      return { amount: String(existing.amount), transactions: String(existing.transactions) }
    case ReportKind.MonthlyAmountOnly:
      return { amount: String(existing.amount) }
    case ReportKind.MonthlyWithModules:
      return {
        amount: String(existing.amount),
        transactions: String(existing.transactions),
        modulesAmount: String(existing.modulesAmount),
        modulesTransactions: String(existing.modulesTransactions),
      }
    case ReportKind.MonthlyDaily: {
      const total = daysInPeriod(period)
      const values: MonthlyDailyFormValues = {}
      for (let n = 1; n <= total; n++) {
        values[n] = { amount: '0', transactions: '0' }
      }
      for (const day of existing.days) {
        const dayOfMonth = day.date.getUTCDate()
        values[dayOfMonth] = { amount: String(day.amount), transactions: String(day.transactions) }
      }
      return values
    }
  }
}


const valuesFromFormData = (kind: ReportKind, formData: FormData, period: Period): Record<string, string> | MonthlyDailyFormValues => {
  if (kind === ReportKind.MonthlyDaily) {
    return dailyValuesFromFormData(formData, period)
  }
  const get = (k: string) => formData.get(k)?.toString() ?? ''
  if (kind === ReportKind.MonthlyWithModules) {
    return {
      amount: get('amount'),
      transactions: get('transactions'),
      modulesAmount: get('modulesAmount'),
      modulesTransactions: get('modulesTransactions'),
    }
  }
  if (kind === ReportKind.MonthlyAmountOnly) {
    return { amount: get('amount') }
  }
  return { amount: get('amount'), transactions: get('transactions') }
}


const parseForKind = (
  kind: ReportKind,
  formData: FormData,
  tenantId: number,
  period: Period,
): ParseResult<SaleInput> => {
  switch (kind) {
    case ReportKind.Monthly:
      return parseMonthlySaleForm(formData, tenantId, period)
    case ReportKind.MonthlyAmountOnly:
      return parseMonthlyAmountOnlyForm(formData, tenantId, period)
    case ReportKind.MonthlyWithModules:
      return parseMonthlyWithModulesForm(formData, tenantId, period)
    case ReportKind.MonthlyDaily:
      return parseMonthlyDailyForm(formData, tenantId, period)
  }
}


app.get('/year/:year/month/:month/tenant/:tenantId/sales-report/create/', async (c) => {
  const { tenantId, year, month } = c.req.param()
  const period = createPeriod(Number(month), Number(year))
  const tenant = TenantService.getTenantById(Number(tenantId))

  if (!tenant) {
    return c.json({ status: 'error', message: 'Tenant not found' }, 404)
  }

  const url = `/year/${period.year}/month/${period.month}/tenant/${tenant.id}/sales-report/create/`
  const backHref = `/year/${period.year}/month/${period.month}/tenant/list/`
  const existing = SaleService.findExisting(tenant, period)
  const values = existing ? valuesFromExisting(existing, period) : emptyValuesFor(tenant.reportKind, period)

  return c.html(
    <Layout backHref={backHref}>
      <div class="mx-auto max-w-3xl">
        <div class="mb-4">
          <h1 class="text-2xl font-semibold">Reporte de ventas</h1>
          <p class="mt-1 text-sm opacity-60">{tenant.tenantName} — {period.month}/{period.year}</p>
        </div>
        {existing && (
          <div class="alert alert-info alert-sm mb-3">
            <span>Estás editando un reporte existente para este período.</span>
          </div>
        )}
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body gap-3 p-4">
            {renderFormForKind(tenant.reportKind, url, period, values, {})}
          </div>
        </div>
      </div>
    </Layout>
  )
})


app.post('/year/:year/month/:month/tenant/:tenantId/sales-report/create/', async (c) => {
  const { tenantId, year, month } = c.req.param()
  const period = createPeriod(Number(month), Number(year))
  const tenant = TenantService.getTenantById(Number(tenantId))
  const formData = await c.req.formData()

  if (!tenant) {
    return c.json({ status: 'error', message: 'Tenant not found' }, 404)
  }

  const url = `/year/${period.year}/month/${period.month}/tenant/${tenant.id}/sales-report/create/`
  const backHref = `/year/${period.year}/month/${period.month}/tenant/list/`
  const result = parseForKind(tenant.reportKind, formData, tenant.id, period)

  if (!result.ok) {
    return c.html(
      <Layout backHref={backHref}>
        <div class="mx-auto max-w-3xl">
          <div class="card bg-base-100 shadow-sm">
            <div class="card-body gap-3 p-4">
              {renderFormForKind(
                tenant.reportKind,
                url,
                period,
                valuesFromFormData(tenant.reportKind, formData, period),
                result.errors,
              )}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  SaleService.store(result.data)
  return c.redirect(`/year/${period.year}/month/${period.month}/tenant/list/`)
})


export default app
