import { Period, ReportKind, SaleInput } from '../types'


export type FieldErrors = Record<string, string>


export type ParseResult<T> =
    | { ok: true; data: T }
    | { ok: false; errors: FieldErrors }


const readAmount = (formData: FormData, key: string): { value: number; raw: string } => {
    const raw = formData.get(key)?.toString() ?? ''
    const value = Number(raw)
    return { value, raw }
}


const validateAmount = (key: string, raw: string, value: number, errors: FieldErrors): void => {
    if (raw === '' || isNaN(value)) {
        errors[key] = 'Monto de ventas inválido'
        return
    }
    if (value < 0) {
        errors[key] = 'Monto de ventas no puede ser negativo'
    }
}


const validateTransactions = (key: string, raw: string, value: number, errors: FieldErrors): void => {
    if (raw === '' || isNaN(value)) {
        errors[key] = 'Número de transacciones inválido'
        return
    }
    if (value < 0) {
        errors[key] = 'Número de transacciones no puede ser negativo'
    }
}


export const parseMonthlySaleForm = (
    formData: FormData,
    tenantId: number,
    period: Period,
): ParseResult<SaleInput> => {
    const errors: FieldErrors = {}
    const amount = readAmount(formData, 'amount')
    const transactions = readAmount(formData, 'transactions')

    validateAmount('amount', amount.raw, amount.value, errors)
    validateTransactions('transactions', transactions.raw, transactions.value, errors)

    if (Object.keys(errors).length > 0) {
        return { ok: false, errors }
    }

    return {
        ok: true,
        data: {
            kind: ReportKind.Monthly,
            tenantId,
            period,
            amount: amount.value,
            transactions: transactions.value,
        },
    }
}


export const parseMonthlyAmountOnlyForm = (
    formData: FormData,
    tenantId: number,
    period: Period,
): ParseResult<SaleInput> => {
    const errors: FieldErrors = {}
    const amount = readAmount(formData, 'amount')

    validateAmount('amount', amount.raw, amount.value, errors)

    if (Object.keys(errors).length > 0) {
        return { ok: false, errors }
    }

    return {
        ok: true,
        data: {
            kind: ReportKind.MonthlyAmountOnly,
            tenantId,
            period,
            amount: amount.value,
        },
    }
}


export const parseMonthlyWithModulesForm = (
    formData: FormData,
    tenantId: number,
    period: Period,
): ParseResult<SaleInput> => {
    const errors: FieldErrors = {}
    const amount = readAmount(formData, 'amount')
    const transactions = readAmount(formData, 'transactions')
    const modulesAmount = readAmount(formData, 'modulesAmount')
    const modulesTransactions = readAmount(formData, 'modulesTransactions')

    validateAmount('amount', amount.raw, amount.value, errors)
    validateTransactions('transactions', transactions.raw, transactions.value, errors)
    validateAmount('modulesAmount', modulesAmount.raw, modulesAmount.value, errors)
    validateTransactions('modulesTransactions', modulesTransactions.raw, modulesTransactions.value, errors)

    if (Object.keys(errors).length > 0) {
        return { ok: false, errors }
    }

    return {
        ok: true,
        data: {
            kind: ReportKind.MonthlyWithModules,
            tenantId,
            period,
            amount: amount.value,
            transactions: transactions.value,
            modulesAmount: modulesAmount.value,
            modulesTransactions: modulesTransactions.value,
        },
    }
}


const daysInPeriod = (period: Period): number => {
    return new Date(period.year, period.month, 0).getDate()
}


export const parseMonthlyDailyForm = (
    formData: FormData,
    tenantId: number,
    period: Period,
): ParseResult<SaleInput> => {
    const errors: FieldErrors = {}
    const total = daysInPeriod(period)
    const days = []

    for (let n = 1; n <= total; n++) {
        const amountRaw = formData.get(`days[${n}].amount`)?.toString() ?? ''
        const transactionsRaw = formData.get(`days[${n}].transactions`)?.toString() ?? ''
        const amountKey = `days.${n}.amount`
        const transactionsKey = `days.${n}.transactions`

        const amount = amountRaw === '' ? 0 : Number(amountRaw)
        const transactions = transactionsRaw === '' ? 0 : Number(transactionsRaw)

        if (amountRaw !== '' && (isNaN(amount) || amount < 0)) {
            errors[amountKey] = 'Monto de ventas inválido'
        }
        if (transactionsRaw !== '' && (isNaN(transactions) || transactions < 0)) {
            errors[transactionsKey] = 'Número de transacciones inválido'
        }

        days.push({
            tenantId,
            date: new Date(period.year, period.month - 1, n),
            amount: isNaN(amount) ? 0 : amount,
            transactions: isNaN(transactions) ? 0 : transactions,
        })
    }

    if (Object.keys(errors).length > 0) {
        return { ok: false, errors }
    }

    return {
        ok: true,
        data: {
            kind: ReportKind.MonthlyDaily,
            tenantId,
            period,
            days,
        },
    }
}
