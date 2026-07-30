import { db } from '../db'
import { ReportKind, Tenant, parseReportKind } from '../types'


type TenantRow = {
    id: number,
    tenantName: string,
    documentNumber: string,
    brandName: string,
    locationName: string,
    reportKind: string
}

export const TenantRepository = {
    list: (): Tenant[] => {
        const query = `
        select
            t.id as id,
            t.tenant_name as tenantName,
            t.document_number as documentNumber,
            t.brand_name as brandName,
            t.location_name as locationName,
            rk.name as reportKind
        from tenant t
        join tenant_report_kind trk on t.id = trk.tenant_id
        join report_kind rk on trk.report_kind_id = rk.id
        limit 50`
        const rows = db.query(query).all() as TenantRow[]
        return rows.map(row => ({
            ...row,
            reportKind: parseReportKind(row.reportKind)
        }))
    },
    get: (tenantId: number): Tenant | null => {
        const query = `
        select
            t.id as id,
            t.tenant_name as tenantName,
            t.document_number as documentNumber,
            t.brand_name as brandName,
            t.location_name as locationName,
            rk.name as reportKind
        from tenant t
        join tenant_report_kind trk on t.id = trk.tenant_id
        join report_kind rk on trk.report_kind_id = rk.id
        where t.id = $tenantId
        limit 1`
        const row = db.query(query).get({ $tenantId: tenantId}) as TenantRow | null
        return row ? { ...row, reportKind: parseReportKind(row.reportKind) } : null
    }
}
