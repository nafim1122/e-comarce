import React, { useState, useEffect } from 'react'
import AdminLayout from '../../shared/AdminLayout'
import Table from '../../components/Table'
import Modal from '../../components/Modal'
import ProductForm from './_components/ProductForm'

const mock = [
  { id: 'p1', title: 'Green Tea', price: 120, stock: 50 },
  { id: 'p2', title: 'Black Tea', price: 110, stock: 10 }
]

export default function ProductsPageImpl() {
  const [data, setData] = useState(mock)
  const [open, setOpen] = useState(false)

  return (
    <AdminLayout>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Products</h1>
          <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={() => setOpen(true)}>Add Product</button>
        </div>
        <div className="mt-4">
          <Table
            columns={[
              { key: 'title', title: 'Title' },
              { key: 'price', title: 'Price' },
              { key: 'stock', title: 'Stock' }
            ]}
            data={data}
          />
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)}>
        <ProductForm onSubmit={(v) => {
          setData((s) => [{ id: 'local-' + Date.now(), title: v.title, price: v.price, stock: 0, image: v.image }, ...s])
          setOpen(false)
        }} />
      </Modal>
    </AdminLayout>
  )
}
