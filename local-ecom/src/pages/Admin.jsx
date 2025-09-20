import React, { useState } from 'react'
import { useProducts } from '../state/products'

const ADMIN_EMAIL = 'admin@example.com'
const ADMIN_PASSWORD = 'admin123'

export default function Admin(){
  const { products, add, update, remove } = useProducts()
  const [loggedIn, setLoggedIn] = useState(false)
  const [creds, setCreds] = useState({ email: '', password: '' })
  const [editing, setEditing] = useState(null)

  const tryLogin = (e) => {
    e.preventDefault()
    if(creds.email === ADMIN_EMAIL && creds.password === ADMIN_PASSWORD){
      setLoggedIn(true)
    } else alert('Invalid credentials')
  }

  const startAdd = () => setEditing({ id: Date.now().toString(), name: '', price: 0, description: '', image: '' })
  const save = (e) => {
    e.preventDefault()
    if(!editing.name || !editing.image) return alert('Name and image required')
    if(Number.isNaN(Number(editing.price))) return alert('Price must be a number')
    const exists = products.find(p => p.id === editing.id)
    if(exists) update(editing.id, editing)
    else add(editing)
    setEditing(null)
  }

  return (
    <div>
      {!loggedIn ? (
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-4">Admin Login</h2>
          <form onSubmit={tryLogin} className="space-y-3">
            <input value={creds.email} onChange={e => setCreds({...creds, email:e.target.value})} placeholder="Email" className="w-full p-2 border" />
            <input value={creds.password} onChange={e => setCreds({...creds, password:e.target.value})} placeholder="Password" type="password" className="w-full p-2 border" />
            <button className="bg-blue-600 text-white px-3 py-2 rounded">Login</button>
          </form>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Admin Dashboard</h2>
            <div>
              <button onClick={() => setLoggedIn(false)} className="text-sm text-red-600">Logout</button>
            </div>
          </div>

          <div className="mb-4 flex gap-2">
            <button onClick={startAdd} className="bg-green-600 text-white px-3 py-2 rounded">Add Product</button>
          </div>

          {editing && (
            <form onSubmit={save} className="bg-white p-4 rounded shadow mb-4">
              <label className="block text-sm">Name</label>
              <input className="w-full p-2 border mb-2" value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} />
              <label className="block text-sm">Price</label>
              <input className="w-full p-2 border mb-2" value={editing.price} onChange={e => setEditing({...editing, price: e.target.value})} />
              <label className="block text-sm">Image URL</label>
              <input className="w-full p-2 border mb-2" value={editing.image} onChange={e => setEditing({...editing, image: e.target.value})} />
              <label className="block text-sm">Description</label>
              <textarea className="w-full p-2 border mb-2" value={editing.description} onChange={e => setEditing({...editing, description: e.target.value})} />
              <div className="flex gap-2">
                <button className="bg-blue-600 text-white px-3 py-2 rounded">Save</button>
                <button type="button" onClick={() => setEditing(null)} className="px-3 py-2 border">Cancel</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {products.map(p => (
              <div key={p.id} className="bg-white p-3 rounded shadow">
                <img src={p.image} alt={p.name} className="w-full h-36 object-cover rounded mb-3" />
                <div className="font-semibold">{p.name}</div>
                <div>${p.price}</div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setEditing(p)} className="px-2 py-1 border">Edit</button>
                  <button onClick={() => remove(p.id)} className="px-2 py-1 text-red-600">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
