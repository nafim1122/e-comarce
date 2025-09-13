import Head from 'next/head'
import AdminLayout from '../shared/AdminLayout'
import Dashboard from '../views/Dashboard'

export default function Home() {
  return (
    <AdminLayout>
      <Head>
        <title>Admin Dashboard</title>
      </Head>
      <Dashboard />
    </AdminLayout>
  )
}
