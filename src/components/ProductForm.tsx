import React, { useCallback, useRef, useState } from 'react'
import imageCompression from 'browser-image-compression'
import { storage } from '../lib/firebase'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { addProduct, updateProduct } from '../lib/product'
import { Product } from '../types'

type Props = {
  initial?: Partial<Product>
  onSaved?: (p: Product) => void
}

export default function ProductForm({ initial = {}, onSaved }: Props) {
  const [name, setName] = useState(initial.name ?? '')
  const [price, setPrice] = useState<number>(initial.price ?? 0)
  const [unit, setUnit] = useState<'kg' | 'piece'>(initial.unit ?? 'kg')
  const [basePricePerKg, setBasePricePerKg] = useState<number>(initial.basePricePerKg ?? 0)
  const [inStock, setInStock] = useState<boolean>(initial.inStock ?? true)
  const [category, setCategory] = useState<string>(initial.category ?? '')
  const [description, setDescription] = useState<string>(initial.description ?? '')

  const [files, setFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>(initial.img ? [initial.img] : [])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // We only support fixed 0.5kg and 1kg options; admin sets basePricePerKg only
  const inputRef = useRef<HTMLInputElement | null>(null)

  const onSelectFiles = (f: FileList | null) => {
    if (!f) return
    const arr = Array.from(f)
    setFiles(arr)
    setPreviewUrls(arr.map((x) => URL.createObjectURL(x)))
  }

  const onDrop: React.DragEventHandler = (e) => {
    e.preventDefault()
    if (!e.dataTransfer) return
    const f = e.dataTransfer.files
    onSelectFiles(f)
  }

  const onDragOver: React.DragEventHandler = (e) => {
    e.preventDefault()
  }

  const compressAndUpload = useCallback(async (file: File) => {
    // compress image to ~400KB and max dimension 1600
    const options = { maxSizeMB: 0.4, maxWidthOrHeight: 1600, useWebWorker: true }
    const compressed = await imageCompression(file, options)
    const path = `products/${Date.now()}_${compressed.name}`
    const ref = storageRef(storage, path)
    await uploadBytes(ref, compressed)
    const url = await getDownloadURL(ref)
    return url
  }, [])

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Name is required')
    if (!(price > 0 || basePricePerKg > 0)) return setError('Provide a price (price or base price per kg)')

    setUploading(true)
    try {
      const imageUrls: string[] = []
      for (const f of files) {
        const url = await compressAndUpload(f)
        imageUrls.push(url)
      }

      const payload: Omit<Product, 'id'> = {
        name: name.trim(),
        price: price,
        oldPrice: initial.oldPrice ?? 0,
        basePricePerKg: basePricePerKg || undefined,
        unit: unit,
        kgStep: initial.kgStep ?? 0.1,
        minQuantity: initial.minQuantity ?? (unit === 'kg' ? 0.5 : 1),
        maxQuantity: initial.maxQuantity ?? (unit === 'kg' ? 5 : 9999),
        img: imageUrls[0] ?? previewUrls[0] ?? '',
        description: description,
        category: category,
        inStock: inStock,
        priceTiers: initial.priceTiers,
  // No preset multipliers; pricing for 0.5/1 derived from basePricePerKg
      }

      // If initial has id -> update existing product, otherwise add new
      if (initial?.id) {
        await updateProduct(String(initial.id), payload as Partial<Product>)
        const saved: Product = { id: String(initial.id), ...payload }
        onSaved?.(saved)
      } else {
        const id = await addProduct(payload as Omit<Product, 'id'>)
        const saved: Product = { id, ...payload }
        onSaved?.(saved)
      }
    } catch (err: unknown) {
      console.error(err)
      const message = (err as { message?: string })?.message || 'Upload failed'
      setError(message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border rounded p-2" placeholder="Product name" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Price (piece)</label>
          <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="mt-1 block w-full border rounded p-2" placeholder="0.00" min={0} step={0.01} />
        </div>
        <div>
          <label className="block text-sm font-medium">Base price (per kg)</label>
          <input type="number" value={basePricePerKg} onChange={(e) => setBasePricePerKg(Number(e.target.value))} className="mt-1 block w-full border rounded p-2" placeholder="0.00" min={0} step={0.01} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Unit</label>
          <select aria-label="Unit" title="Unit" value={unit} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUnit(e.target.value as 'kg'|'piece')} className="mt-1 block w-full border rounded p-2">
            <option value="kg">kg</option>
            <option value="piece">piece</option>
          </select>
        </div>
        <div>
          <label htmlFor="product-category" className="block text-sm font-medium">Category</label>
          <input id="product-category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full border rounded p-2" placeholder="e.g. Beverages" />
        </div>
      </div>

      <div>
        <label htmlFor="product-desc" className="block text-sm font-medium">Description</label>
        <textarea id="product-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full border rounded p-2" rows={3} placeholder="Short description" />
      </div>

      <div>
        <label className="block text-sm font-medium">Images</label>
        <div onDrop={onDrop} onDragOver={onDragOver} className="mt-1 border-2 border-dashed rounded p-4 text-center cursor-pointer">
          <p className="text-sm text-gray-600">Drag & drop images here or <button type="button" className="text-blue-600 underline" onClick={() => inputRef.current?.click()}>select</button></p>
          <input aria-label="Upload images" ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onSelectFiles(e.target.files)} />
          <div className="mt-3 grid grid-cols-3 gap-2">
            {previewUrls.map((u, i) => (
              <img key={i} src={u} alt={`preview-${i}`} className="h-24 w-full object-cover rounded" />
            ))}
            {files.map((f, i) => (
              <img key={`f-${i}`} src={URL.createObjectURL(f)} alt={`file-${i}`} className="h-24 w-full object-cover rounded" />
            ))}
          </div>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={uploading} className="px-4 py-2 bg-green-600 text-white rounded">{uploading ? 'Saving...' : 'Save Product'}</button>
        <button type="button" onClick={() => {
          setName(''); setPrice(0); setBasePricePerKg(0); setFiles([]); setPreviewUrls([]); setDescription(''); setCategory('')
        }} className="px-4 py-2 border rounded">Reset</button>
      </div>
    </form>
  )
}
