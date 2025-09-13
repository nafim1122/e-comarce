import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Package, Users, Settings, LogOut } from 'lucide-react'

const items = [
  { key: 'dashboard', label: 'Dashboard', icon: Home },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'orders', label: 'Orders', icon: Users },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'settings', label: 'Settings', icon: Settings }
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className={`bg-white dark:bg-gray-800 border-r ${collapsed ? 'w-20' : 'w-64'} transition-all duration-300`}>
      <div className="p-4 flex items-center justify-between">
        <div className="font-bold">Admin</div>
        <button onClick={() => setCollapsed(!collapsed)} className="text-sm text-gray-500">{collapsed ? '>' : '<'}</button>
      </div>
      <nav className="px-2">
        {items.map((it) => (
          <a key={it.key} className="flex items-center gap-3 p-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
            <it.icon />
            <span className={`truncate ${collapsed ? 'hidden' : 'inline-block'}`}>{it.label}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}
