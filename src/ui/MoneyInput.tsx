import { useState } from 'react'

const format = (value: number) => (value ? value.toLocaleString('vi-VN') : '')
const parse = (text: string) => Number(text.replace(/\D/g, '')) || 0

/**
 * VND amount typed as "58.320.000 đ": dots every 3 digits while typing. Controlled with
 * `value`/`onChange`, or uncontrolled with `defaultValue`; `name` posts the plain number.
 */
export function MoneyInput({ name, value, defaultValue, onChange, required, max, ariaLabel }: {
  name?: string
  value?: number
  defaultValue?: number
  onChange?: (value: number) => void
  required?: boolean
  max?: number
  ariaLabel?: string
}) {
  const [own, setOwn] = useState(defaultValue ?? 0)
  const amount = value ?? own
  return (
    <span className="money-input">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={ariaLabel}
        required={required}
        value={format(amount)}
        placeholder="0"
        onChange={(event) => {
          const next = Math.min(parse(event.target.value), max ?? Number.MAX_SAFE_INTEGER)
          if (value === undefined) setOwn(next)
          onChange?.(next)
        }}
      />
      <em aria-hidden="true">đ</em>
      {name && <input type="hidden" name={name} value={amount || ''} />}
    </span>
  )
}
