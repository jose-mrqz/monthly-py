import type { FC } from 'hono/jsx'
import { Tenant } from '../types';

type TenantRowProps = {
  tenant: Tenant,
  url: string
}

export const TenantRow: FC<TenantRowProps> = ({ tenant, url }) => {
  return (
    <tr class="hover">
      <td>{tenant.tenantName}</td>
      <td>{tenant.documentNumber}</td>
      <td>{tenant.brandName}</td>
      <td>{tenant.locationName}</td>
      <td class="text-right">
        <a href={url} class="btn btn-sm btn-primary">Editar reporte</a>
      </td>
    </tr>
  )
}