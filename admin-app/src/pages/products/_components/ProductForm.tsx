import React, { useState } from 'react'

type ProductFormProps = {
  onSubmit: (v: { title: string; price: number; image: File | null }) => void
  initial?: { title?: string; price?: number }
}

export default function ProductForm({ onSubmit, initial }: ProductFormProps) {
  const [title, setTitle] = useState<string>(initial?.title || '')
  const [price, setPrice] = useState<number>(initial?.price ?? 0)
  const [image, setImage] = useState<File | null>(null)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ title, price, image })
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor="title" className="block text-sm font-medium">Title</label>
        <input id="title" placeholder="e.g. Honeycomb 500g" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full border rounded p-2 bg-white dark:bg-gray-700" />
      </div>
      <div>
        <label htmlFor="price" className="block text-sm font-medium">Price (per kg)</label>
        <input id="price" placeholder="e.g. 120" type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value || '0'))} className="mt-1 block w-full border rounded p-2 bg-white dark:bg-gray-700" />
      </div>
      <div>
        <label htmlFor="image" className="block text-sm font-medium">Image</label>
        <input id="image" aria-label="Product image" type="file" onChange={(e) => setImage(e.target.files?.[0] || null)} className="mt-1 block w-full" />
      </div>
      <div className="flex justify-end">
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
      </div>
    </form>
  )
}
