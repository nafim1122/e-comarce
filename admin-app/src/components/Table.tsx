import React from 'react'

type Column<T> = { key: string; title: string; render?: (row: T) => React.ReactNode }

function accessKey<T>(row: T, key: string): unknown {
  // Safely access a key on a row when render is not provided.
  return (row as unknown as Record<string, unknown>)[key]
}

export default function Table<T>({ columns, data }: { columns: Column<T>[]; data: T[] }) {
  return (
    <div className="overflow-auto bg-white dark:bg-gray-800 rounded shadow">
      <table className="min-w-full divide-y table-auto">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="text-left p-3 text-sm font-medium text-gray-500">{c.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-t">
              {columns.map((c) => (
                <td key={c.key} className="p-3 text-sm">{c.render ? c.render(row) : String(accessKey(row, c.key) ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
