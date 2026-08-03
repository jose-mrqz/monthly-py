import { SaleRepository } from '../repositories/sale.repository'
import { Period, SaleInput, Tenant } from '../types';


export const SaleService = {
    findExisting: (tenant: Tenant, period: Period): SaleInput | null => {
        return SaleRepository.find(tenant.id, period, tenant.reportKind)
    },
    store: (input: SaleInput, username: string): void => {
        SaleRepository.store(input, username)
    }
}
