/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useState } from 'react'

let id = 0
const listeners: Array<(t: { id: number; msg: string }) => void> = []

export function pushToast(msg: string) {
  const ev = { id: ++id, msg }
  listeners.forEach((l) => l(ev))
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([])
  useEffect(() => {
    const l = (t: { id: number; msg: string }) => setToasts((s) => [...s, t])
    listeners.push(l)
    return () => {
      const i = listeners.indexOf(l)
      if (i >= 0) listeners.splice(i, 1)
    }
  }, [])

  useEffect(() => {
    const t = setInterval(() => setToasts((s) => s.slice(1)), 3000)
    return () => clearInterval(t)
  }, [])

  if (toasts.length === 0) return null
  return (
    <div className="fixed right-4 bottom-4 space-y-2 z-50">
      {toasts.map((t) => (
        <div key={t.id} className="bg-gray-900 text-white p-3 rounded">{t.msg}</div>
      ))}
    </div>
  )
}
