import type { FC } from 'hono/jsx'


type MonthlyAmountOnlyFormProps = {
  url: string
  values: {
    amount: string
  }
  errors: {
    amount?: string
    nonfield?: string
  }
}

export const MonthlyAmountOnlyForm: FC<MonthlyAmountOnlyFormProps> = ({ url, values, errors }) => {
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
      {errors?.nonfield && (
        <div class="alert alert-error alert-sm">
          <span>{errors.nonfield}</span>
        </div>
      )}
      <button type="submit" class="btn btn-primary btn-sm btn-block">Guardar</button>
    </form>
  )
}
