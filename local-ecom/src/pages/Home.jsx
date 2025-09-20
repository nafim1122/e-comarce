import React, { useEffect, useState } from 'react'
import { useProducts } from '../state/products'

export default function Home(){
  const { products } = useProducts()
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Products</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {products.length === 0 ? (
          <div className="col-span-3 p-6 text-center text-gray-500">No products yet</div>
        ) : products.map(p => (
          <div key={p.id} className="bg-white p-4 rounded shadow">
            <img src={p.image} alt={p.name} className="w-full h-36 object-cover rounded mb-3" />
            <h3 className="font-semibold">{p.name}</h3>
            <p className="text-sm text-gray-600">{p.description}</p>
            <div className="mt-2 font-bold">${p.price}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
