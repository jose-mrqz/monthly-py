import type { FC } from 'hono/jsx'


type MonthlySaleFormProps = {
  url: string
  values: {
    amount: string
    transactions: string
  }
  errors: {
    amount?: string
    transactions?: string
    nonfield?: string
  }
}

export const MonthlySaleForm: FC<MonthlySaleFormProps> = ({ url, values, errors }) => {
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
      {errors?.nonfield && (
        <div class="alert alert-error alert-sm">
          <span>{errors.nonfield}</span>
        </div>
      )}
      <button type="submit" class="btn btn-primary btn-sm btn-block">Guardar</button>
    </form>
  )
}
