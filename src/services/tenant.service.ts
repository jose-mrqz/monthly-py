import { TenantRepository } from '../repositories/tenant.repository'
import { ReportKind, Tenant } from '../types';

export const TenantService = {
    listTenants: (): Tenant[] => {
        return TenantRepository.list()
    },
    getTenantById: (tenantId: number): Tenant | null => {
    return TenantRepository.get(tenantId)
    }
}