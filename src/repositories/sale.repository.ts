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


const insertRecord = db.query(`
    insert into record (
        report_id,
        date,
        previous_amount,
        amount,
        previous_transactions,
        transactions,
        previous_modules_amount,
        modules_amount,
        previous_modules_transactions,
        modules_transactions,
        username
    ) values (
        $reportId,
        $date,
        $previousAmount,
        $amount,
        $previousTransactions,
        $transactions,
        $previousModulesAmount,
        $modulesAmount,
        $previousModulesTransactions,
        $modulesTransactions,
        $username
    )
`)


const runInsert = (
    tenantId: number,
    reportKindId: number,
    date: string,
    amount: number | null,
    transactions: number | null,
    modulesAmount: number | null,
    modulesTransactions: number | null,
): number => {
    const result = insertReport.run({
        $date: date,
        $amount: amount,
        $transactions: transactions,
        $modulesAmount: modulesAmount,
        $modulesTransactions: modulesTransactions,
        $tenantId: tenantId,
        $reportKindId: reportKindId,
    })
    return Number(result.lastInsertRowid)
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


const runRecord = (
    reportId: number,
    date: string,
    previousAmount: number | null,
    amount: number | null,
    previousTransactions: number | null,
    transactions: number | null,
    previousModulesAmount: number | null,
    modulesAmount: number | null,
    previousModulesTransactions: number | null,
    modulesTransactions: number | null,
    username: string,
): void => {
    insertRecord.run({
        $reportId: reportId,
        $date: date,
        $previousAmount: previousAmount,
        $amount: amount,
        $previousTransactions: previousTransactions,
        $transactions: transactions,
        $previousModulesAmount: previousModulesAmount,
        $modulesAmount: modulesAmount,
        $previousModulesTransactions: previousModulesTransactions,
        $modulesTransactions: modulesTransactions,
        $username: username,
    })
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

    store: (input: SaleInput, username: string): void => {
        const kindId = reportKindId(input.kind)

        switch (input.kind) {
            case ReportKind.Monthly: {
                const date = firstOfMonth(input.period)
                db.transaction(() => {
                    const existing = findMonthlyReport.get({ $tenantId: input.tenantId, $reportKindId: kindId, $date: date }) as ReportRow | null
                    let reportId: number
                    if (existing) {
                        runUpdate(existing.id, input.amount, input.transactions, null, null)
                        reportId = existing.id
                    } else {
                        reportId = runInsert(input.tenantId, kindId, date, input.amount, input.transactions, null, null)
                    }
                    runRecord(
                        reportId,
                        date,
                        existing?.amount ?? null,
                        input.amount,
                        existing?.transactions ?? null,
                        input.transactions,
                        null,
                        null,
                        null,
                        null,
                        username,
                    )
                })()
                return
            }

            case ReportKind.MonthlyAmountOnly: {
                const date = firstOfMonth(input.period)
                db.transaction(() => {
                    const existing = findMonthlyReport.get({ $tenantId: input.tenantId, $reportKindId: kindId, $date: date }) as ReportRow | null
                    let reportId: number
                    if (existing) {
                        runUpdate(existing.id, input.amount, null, null, null)
                        reportId = existing.id
                    } else {
                        reportId = runInsert(input.tenantId, kindId, date, input.amount, null, null, null)
                    }
                    runRecord(
                        reportId,
                        date,
                        existing?.amount ?? null,
                        input.amount,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        username,
                    )
                })()
                return
            }

            case ReportKind.MonthlyWithModules: {
                const date = firstOfMonth(input.period)
                db.transaction(() => {
                    const existing = findMonthlyReport.get({ $tenantId: input.tenantId, $reportKindId: kindId, $date: date }) as ReportRow | null
                    let reportId: number
                    if (existing) {
                        runUpdate(existing.id, input.amount, input.transactions, input.modulesAmount, input.modulesTransactions)
                        reportId = existing.id
                    } else {
                        reportId = runInsert(input.tenantId, kindId, date, input.amount, input.transactions, input.modulesAmount, input.modulesTransactions)
                    }
                    runRecord(
                        reportId,
                        date,
                        existing?.amount ?? null,
                        input.amount,
                        existing?.transactions ?? null,
                        input.transactions,
                        existing?.modules_amount ?? null,
                        input.modulesAmount,
                        existing?.modules_transactions ?? null,
                        input.modulesTransactions,
                        username,
                    )
                })()
                return
            }

            case ReportKind.MonthlyDaily:
                db.transaction(() => {
                    for (const day of input.days) {
                        const date = day.date.toISOString()
                        const existing = findMonthlyReport.get({ $tenantId: input.tenantId, $reportKindId: kindId, $date: date }) as ReportRow | null
                        let reportId: number
                        if (existing) {
                            runUpdate(existing.id, day.amount, day.transactions, null, null)
                            reportId = existing.id
                        } else {
                            reportId = runInsert(input.tenantId, kindId, date, day.amount, day.transactions, null, null)
                        }
                        runRecord(
                            reportId,
                            date,
                            existing?.amount ?? null,
                            day.amount,
                            existing?.transactions ?? null,
                            day.transactions,
                            null,
                            null,
                            null,
                            null,
                            username,
                        )
                    }
                })()
                return
        }
    }
}
