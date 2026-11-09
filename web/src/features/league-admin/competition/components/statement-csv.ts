import type { Transaction } from '../types'
import { statusLabels, transactionTypeLabel } from './transaction-types'

/** Byte-order mark so Excel opens the file as UTF-8. */
const BOM = String.fromCharCode(0xfeff)
const cell = (value: string) => `"${value.replace(/"/g, '""')}"`
const day = (value?: string) => (value ? value.slice(0, 10) : '')

/** CSV (Excel-friendly, UTF-8 with BOM) of a team's account statement. */
export function statementCsv(transactions: Transaction[]): string {
  const header = ['Fecha', 'Descripción', 'Tipo', 'Monto', 'Pagado', 'Estado', 'Vencimiento', 'Recibo']
  const rows = transactions.map((tx) =>
    [
      day(tx.transaction_date),
      tx.description,
      transactionTypeLabel(tx.transaction_type),
      `${tx.is_income ? '' : '-'}${tx.amount}`,
      tx.amount_paid,
      statusLabels[tx.status] ?? tx.status,
      day(tx.due_date),
      tx.receipt_number ?? '',
    ].map(cell),
  )
  return `${BOM}${[header.map(cell), ...rows].map((row) => row.join(',')).join('\r\n')}\r\n`
}

/** Hands the statement to the browser as a file download. */
export function downloadStatement(teamName: string, transactions: Transaction[]) {
  const url = URL.createObjectURL(new Blob([statementCsv(transactions)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `estado-de-cuenta-${teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
