import React from 'react'
import { motion } from 'framer-motion'

export default function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose} />
      <motion.div initial={{ y: 20, scale: 0.98 }} animate={{ y: 0, scale: 1 }} className="bg-white dark:bg-gray-800 rounded shadow-lg p-6 z-10 w-full max-w-2xl">
        {children}
      </motion.div>
    </div>
  )
}
