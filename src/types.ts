export type Tenant = {
    id: number
    tenantName: string
    documentNumber: string
    brandName: string
    locationName: string
    reportKind: ReportKind
}

export type Period = {
    month: number
    year: number
}

export enum ReportKind {
    Monthly = "monthly",
    MonthlyAmountOnly = "monthly_amount_only",
    MonthlyWithModules = "monthly_with_modules",
    MonthlyDaily = "monthly_daily"
}

export const parseReportKind = (str: string): ReportKind => {
    switch (str) {
        case "monthly": return ReportKind.Monthly
        case "monthly_amount_only": return ReportKind.MonthlyAmountOnly
        case "monthly_with_modules": return ReportKind.MonthlyWithModules
        case "monthly_daily": return ReportKind.MonthlyDaily
        default: throw new Error(`Invalid report kind: ${str}`)
    }
};


export type MonthlySale = {
    tenantId: number
    period: Period
    amount: number
    transactions: number
}


export type MonthlySaleAmountOnly = {
    tenantId: number
    period: Period
    amount: number
}


export type MonthlySaleWithModules = {
    tenantId: number
    period: Period
    amount: number
    transactions: number
    modulesAmount: number
    modulesTransactions: number
}

export type DailySale = {
    tenantId: number
    date: Date
    amount: number
    transactions: number
}


export type MonthlySaleDaily = {
    tenantId: number
    period: Period
    dailyReports: DailySale[]
}


export type SaleInput =
    | { kind: ReportKind.Monthly; tenantId: number; period: Period; amount: number; transactions: number }
    | { kind: ReportKind.MonthlyAmountOnly; tenantId: number; period: Period; amount: number }
    | { kind: ReportKind.MonthlyWithModules; tenantId: number; period: Period; amount: number; transactions: number; modulesAmount: number; modulesTransactions: number }
    | { kind: ReportKind.MonthlyDaily; tenantId: number; period: Period; days: DailySale[] }


export const createPeriod = (month: number, year: number): Period => {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
        throw new Error("Invalid month. Month must be an integer between 1 and 12.")
    }
    if (!Number.isInteger(year) || year < 1990 || year > 2100) {
        throw new Error("Invalid year. Year must be a non-negative integer.")
    }
    return { month, year }
}

export const shiftPeriod = (period: Period, deltaMonths: number): Period => {
    const d = new Date(period.year, period.month - 1 + deltaMonths, 1)
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export const tenantListHref = (period: Period): string => {
    return `/monthly-py/year/${period.year}/month/${period.month}/tenant/list/`
}

const MONTH_NAMES_ES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const

export const monthNameEs = (month: number): string => {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
        throw new Error(`Invalid month: ${month}`)
    }
    return MONTH_NAMES_ES[month - 1]
}

export const currentPeriodTenantListHref = (): string => {
    const today = new Date()
    return tenantListHref({ year: today.getFullYear(), month: today.getMonth() + 1 })
}

export const salesReportHref = (period: Period, tenantId: number): string => {
    return `/monthly-py/year/${period.year}/month/${period.month}/tenant/${tenantId}/sales-report/create/`
}
