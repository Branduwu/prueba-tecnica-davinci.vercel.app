import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = { title: 'Mercado ERP', description: 'Operación diaria del supermercado' }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}</body></html> }
