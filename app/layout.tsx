import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'La Parada Digital · Formalización del mercado mayorista',
  description:
    'Plataforma para formalizar comerciantes y puestos, eliminar los cupos en el estibaje, ordenar el ingreso vehicular y controlar la salubridad del mercado La Parada.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-stone-50 font-sans text-stone-900 antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
