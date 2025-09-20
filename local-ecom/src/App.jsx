import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Admin from './pages/Admin'
import { ProductsProvider } from './state/products'

export default function App(){
  return (
    <ProductsProvider>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b p-4">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold">Local Ecom</h1>
            <nav className="space-x-4">
              <Link to="/" className="text-gray-700">Home</Link>
              <Link to="/admin" className="text-gray-700">Admin</Link>
            </nav>
          </div>
        </header>
        <main className="max-w-4xl mx-auto p-6">
          <Routes>
            <Route path="/" element={<Home/>} />
            <Route path="/admin" element={<Admin/>} />
          </Routes>
        </main>
      </div>
    </ProductsProvider>
  )
}
