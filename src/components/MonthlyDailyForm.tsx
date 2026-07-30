import type { FC } from 'hono/jsx'


export type MonthlyDailyFormValues = Record<number, { amount: string; transactions: string }>


type MonthlyDailyFormProps = {
    url: string
    daysInPeriod: number
    values: MonthlyDailyFormValues
    errors: {
        nonfield?: string
    } & Record<string, string | undefined>
}


export const MonthlyDailyForm: FC<MonthlyDailyFormProps> = ({ url, daysInPeriod, values, errors }) => {
    const days = []
    for (let n = 1; n <= daysInPeriod; n++) {
        const amountError = errors[`days.${n}.amount`]
        const transactionsError = errors[`days.${n}.transactions`]
        const value = values[n] ?? { amount: '', transactions: '' }
        days.push(
            <tr>
                <td class="font-medium">Día {n}</td>
                <td>
                    <input
                        type="number"
                        name={`days[${n}].amount`}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        class={`input input-bordered input-sm w-full ${amountError ? 'input-error' : ''}`}
                        value={value.amount}
                    />
                    {amountError && <p class="text-error text-xs mt-1">{amountError}</p>}
                </td>
                <td>
                    <input
                        type="number"
                        name={`days[${n}].transactions`}
                        placeholder="0"
                        min="0"
                        step="1"
                        class={`input input-bordered input-sm w-full ${transactionsError ? 'input-error' : ''}`}
                        value={value.transactions}
                    />
                    {transactionsError && <p class="text-error text-xs mt-1">{transactionsError}</p>}
                </td>
            </tr>
        )
    }

    return (
        <form action={url} method="post" class="flex flex-col gap-4">
            <p class="text-sm opacity-70">
                Registra las ventas de cada día del mes. Deja el campo en 0 si no hubo ventas.
            </p>
            <div class="overflow-x-auto">
                <table class="table table-sm table-zebra">
                    <thead>
                        <tr>
                            <th class="text-xs uppercase tracking-wide opacity-70 font-semibold">Día</th>
                            <th class="text-xs uppercase tracking-wide opacity-70 font-semibold">Monto (0 si no hubo ventas)</th>
                            <th class="text-xs uppercase tracking-wide opacity-70 font-semibold">Transacciones (0 si no hubo ventas)</th>
                        </tr>
                    </thead>
                    <tbody>{days}</tbody>
                </table>
            </div>
            {errors?.nonfield && (
                <div class="alert alert-error alert-sm">
                    <span>{errors.nonfield}</span>
                </div>
            )}
            <button type="submit" class="btn btn-primary btn-sm btn-block">Guardar</button>
        </form>
    )
}
