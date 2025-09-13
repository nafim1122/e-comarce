import React from 'react'
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
  { name: 'Mon', sales: 400 },
  { name: 'Tue', sales: 600 },
  { name: 'Wed', sales: 800 },
  { name: 'Thu', sales: 700 },
  { name: 'Fri', sales: 1200 }
]

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded shadow p-4 h-64">
          <h2 className="font-medium mb-2">Sales (7d)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <Line type="monotone" dataKey="sales" stroke="#8884d8" />
              <CartesianGrid stroke="#eee" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded shadow p-4 h-64">
          <h2 className="font-medium mb-2">Inventory</h2>
          <p className="text-sm text-gray-500">Top products and low stock alerts will appear here.</p>
        </div>
      </div>
    </div>
  )
}
