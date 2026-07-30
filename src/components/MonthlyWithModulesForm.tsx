import type { FC } from 'hono/jsx'


type MonthlyWithModulesFormProps = {
  url: string
  values: {
    amount: string
    transactions: string
    modulesAmount: string
    modulesTransactions: string
  }
  errors: {
    amount?: string
    transactions?: string
    modulesAmount?: string
    modulesTransactions?: string
    nonfield?: string
  }
}

export const MonthlyWithModulesForm: FC<MonthlyWithModulesFormProps> = ({ url, values, errors }) => {
  return (
    <form action={url} method="post" class="flex flex-col gap-4">
      <fieldset class="fieldset">
        <legend class="fieldset-legend">Monto de ventas</legend>
        <input
          type="number"
          name="amount"
          placeholder="Monto de ventas"
          class="input input-bordered input-sm w-full"
          required
          value={values.amount}
        />
        {errors?.amount && (
          <p class="text-error text-xs mt-1">{errors.amount}</p>
        )}
      </fieldset>
      <fieldset class="fieldset">
        <legend class="fieldset-legend">Número de transacciones</legend>
        <input
          type="number"
          name="transactions"
          placeholder="Número de transacciones"
          class="input input-bordered input-sm w-full"
          required
          value={values.transactions}
        />
        {errors?.transactions && (
          <p class="text-error text-xs mt-1">{errors.transactions}</p>
        )}
      </fieldset>
      <div class="divider text-xs opacity-60 my-1">Módulos</div>
      <fieldset class="fieldset">
        <legend class="fieldset-legend">Monto de ventas de módulos</legend>
        <input
          type="number"
          name="modulesAmount"
          placeholder="Monto de ventas de módulos"
          class="input input-bordered input-sm w-full"
          required
          value={values.modulesAmount}
        />
        {errors?.modulesAmount && (
          <p class="text-error text-xs mt-1">{errors.modulesAmount}</p>
        )}
      </fieldset>
      <fieldset class="fieldset">
        <legend class="fieldset-legend">Número de transacciones de módulos</legend>
        <input
          type="number"
          name="modulesTransactions"
          placeholder="Número de transacciones de módulos"
          class="input input-bordered input-sm w-full"
          required
          value={values.modulesTransactions}
        />
        {errors?.modulesTransactions && (
          <p class="text-error text-xs mt-1">{errors.modulesTransactions}</p>
        )}
      </fieldset>
      {errors?.nonfield && (
        <div class="alert alert-error alert-sm">
          <span>{errors.nonfield}</span>
        </div>
      )}
      <button type="submit" class="btn btn-primary btn-sm btn-block">Guardar</button>
    </form>
  )
}
