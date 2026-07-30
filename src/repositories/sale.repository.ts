import { db } from '../db'
import { DailySale, Period, ReportKind, SaleInput } from '../types'


const firstOfMonth = (period: Period): string => {
    return new Date(period.year, period.month - 1, 1).toISOString()
}


const monthPrefix = (period: Period): string => {
    const mm = String(period.month).padStart(2, '0')
    return `${period.year}-${mm}-%`
}


const reportKindId = (kind: ReportKind): number => {
    const row = db.query(`select id from report_kind where name = $name limit 1`).get({ $name: kind }) as { id: number } | null
    if (!row) {
        throw new Error(`Report kind not found in database: ${kind}`)
    }
    return row.id
}


type ReportRow = {
    id: number
    date: string
    amount: number | null
    transactions: number | null
    modules_amount: number | null
    modules_transactions: number | null
}


const insertReport = db.query(`
    insert into report (
        date,
        amount,
        transactions,
        modules_amount,
        modules_transactions,
        tenant_id,
        report_kind_id
    ) values (
        $date,
        $amount,
        $transactions,
        $modulesAmount,
        $modulesTransactions,
        $tenantId,
        $reportKindId
    )
`)


const updateReportById = db.query(`
    update report set
        amount = $amount,
        transactions = $transactions,
        modules_amount = $modulesAmount,
        modules_transactions = $modulesTransactions
    where id = $id
`)


const findReportIdByDate = db.query(`
    select id from report
    where tenant_id = $tenantId
      and report_kind_id = $reportKindId
      and date = $date
    limit 1
`)


const findReportIdByMonth = db.query(`
    select id from report
    where tenant_id = $tenantId
      and report_kind_id = $reportKindId
      and date = $date
    limit 1
`)


const findMonthlyReport = db.query(`
    select id, date, amount, transactions, modules_amount, modules_transactions
    from report
    where tenant_id = $tenantId
      and report_kind_id = $reportKindId
      and date = $date
    limit 1
`)


const findDailyReports = db.query(`
    select date, amount, transactions
    from report
    where tenant_id = $tenantId
      and report_kind_id = $reportKindId
      and date like $datePattern
    order by date
`)


const runInsert = (
    tenantId: number,
    reportKindId: number,
    date: string,
    amount: number | null,
    transactions: number | null,
    modulesAmount: number | null,
    modulesTransactions: number | null,
): void => {
    insertReport.run({
        $date: date,
        $amount: amount,
        $transactions: transactions,
        $modulesAmount: modulesAmount,
        $modulesTransactions: modulesTransactions,
        $tenantId: tenantId,
        $reportKindId: reportKindId,
    })
}


const runUpdate = (
    id: number,
    amount: number | null,
    transactions: number | null,
    modulesAmount: number | null,
    modulesTransactions: number | null,
): void => {
    updateReportById.run({
        $id: id,
        $amount: amount,
        $transactions: transactions,
        $modulesAmount: modulesAmount,
        $modulesTransactions: modulesTransactions,
    })
}


const findExistingId = (tenantId: number, reportKindId: number, date: string): number | null => {
    const row = findReportIdByMonth.get({ $tenantId: tenantId, $reportKindId: reportKindId, $date: date }) as { id: number } | null
    return row ? row.id : null
}


export const SaleRepository = {
    find: (tenantId: number, period: Period, kind: ReportKind): SaleInput | null => {
        const kindId = reportKindId(kind)

        if (kind === ReportKind.MonthlyDaily) {
            const rows = findDailyReports.all({
                $tenantId: tenantId,
                $reportKindId: kindId,
                $datePattern: monthPrefix(period),
            }) as Array<{ date: string; amount: number | null; transactions: number | null }>

            if (rows.length === 0) {
                return null
            }

            const days: DailySale[] = rows.map(row => ({
                tenantId,
                date: new Date(row.date),
                amount: row.amount ?? 0,
                transactions: row.transactions ?? 0,
            }))

            return { kind: ReportKind.MonthlyDaily, tenantId, period, days }
        }

        const row = findMonthlyReport.get({
            $tenantId: tenantId,
            $reportKindId: kindId,
            $date: firstOfMonth(period),
        }) as ReportRow | null

        if (!row) {
            return null
        }

        switch (kind) {
            case ReportKind.Monthly:
                return {
                    kind: ReportKind.Monthly,
                    tenantId,
                    period,
                    amount: row.amount ?? 0,
                    transactions: row.transactions ?? 0,
                }
            case ReportKind.MonthlyAmountOnly:
                return {
                    kind: ReportKind.MonthlyAmountOnly,
                    tenantId,
                    period,
                    amount: row.amount ?? 0,
                }
            case ReportKind.MonthlyWithModules:
                return {
                    kind: ReportKind.MonthlyWithModules,
                    tenantId,
                    period,
                    amount: row.amount ?? 0,
                    transactions: row.transactions ?? 0,
                    modulesAmount: row.modules_amount ?? 0,
                    modulesTransactions: row.modules_transactions ?? 0,
                }
        }
    },

    store: (input: SaleInput): void => {
        const kindId = reportKindId(input.kind)

        switch (input.kind) {
            case ReportKind.Monthly: {
                const existingId = findExistingId(input.tenantId, kindId, firstOfMonth(input.period))
                if (existingId !== null) {
                    runUpdate(existingId, input.amount, input.transactions, null, null)
                    return
                }
                runInsert(input.tenantId, kindId, firstOfMonth(input.period), input.amount, input.transactions, null, null)
                return
            }

            case ReportKind.MonthlyAmountOnly: {
                const existingId = findExistingId(input.tenantId, kindId, firstOfMonth(input.period))
                if (existingId !== null) {
                    runUpdate(existingId, input.amount, null, null, null)
                    return
                }
                runInsert(input.tenantId, kindId, firstOfMonth(input.period), input.amount, null, null, null)
                return
            }

            case ReportKind.MonthlyWithModules: {
                const existingId = findExistingId(input.tenantId, kindId, firstOfMonth(input.period))
                if (existingId !== null) {
                    runUpdate(existingId, input.amount, input.transactions, input.modulesAmount, input.modulesTransactions)
                    return
                }
                runInsert(input.tenantId, kindId, firstOfMonth(input.period), input.amount, input.transactions, input.modulesAmount, input.modulesTransactions)
                return
            }

            case ReportKind.MonthlyDaily:
                db.transaction(() => {
                    for (const day of input.days) {
                        const date = day.date.toISOString()
                        const existingIdRow = findReportIdByDate.get({ $tenantId: input.tenantId, $reportKindId: kindId, $date: date }) as { id: number } | null
                        if (existingIdRow) {
                            runUpdate(existingIdRow.id, day.amount, day.transactions, null, null)
                        } else {
                            runInsert(input.tenantId, kindId, date, day.amount, day.transactions, null, null)
                        }
                    }
                })()
                return
        }
    }
}
