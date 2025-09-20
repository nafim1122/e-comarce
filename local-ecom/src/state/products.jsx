import React, { createContext, useContext, useEffect, useState } from 'react'

const ProductsContext = createContext(null)

export function ProductsProvider({ children }){
  const [products, setProducts] = useState([])

  useEffect(() => {
    try{
      const raw = localStorage.getItem('localEcom:products')
      if(raw) setProducts(JSON.parse(raw))
    }catch(e){ console.error(e) }
  }, [])

  useEffect(() => {
    try{ localStorage.setItem('localEcom:products', JSON.stringify(products)) }catch(e){}
    // dispatch event so UI can react from other tabs
    window.dispatchEvent(new Event('localEcom:products'))
  }, [products])

  const add = (p) => setProducts(prev => [p, ...prev])
  const update = (id, patch) => setProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  const remove = (id) => setProducts(prev => prev.filter(p => p.id !== id))

  return (
    <ProductsContext.Provider value={{ products, add, update, remove }}>
      {children}
    </ProductsContext.Provider>
  )
}

export const useProducts = () => useContext(ProductsContext)
