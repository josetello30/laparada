import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LayoutDashboard, Store, Grid3x3, HardHat, Truck, Stethoscope, Users, LogOut } from 'lucide-react'
import { obtenerUsuario } from '@/lib/supabase/server'
import { puedeAcceder, type Modulo } from '@/lib/reglas'
import { cerrarSesion } from '@/app/login/acciones'

const menu: { modulo: Modulo; href: string; texto: string; icono: typeof Store }[] = [
  { modulo: 'dashboard', href: '/panel', texto: 'Dashboard', icono: LayoutDashboard },
  { modulo: 'comerciantes', href: '/panel/comerciantes', texto: 'Comerciantes', icono: Store },
  { modulo: 'puestos', href: '/panel/puestos', texto: 'Puestos', icono: Grid3x3 },
  { modulo: 'estibaje', href: '/panel/estibaje', texto: 'Estibaje', icono: HardHat },
  { modulo: 'citas', href: '/panel/citas', texto: 'Citas de descarga', icono: Truck },
  { modulo: 'salubridad', href: '/panel/salubridad', texto: 'Salubridad', icono: Stethoscope },
  { modulo: 'usuarios', href: '/panel/usuarios', texto: 'Usuarios y roles', icono: Users },
]

export const dynamic = 'force-dynamic'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const u = await obtenerUsuario()
  if (!u) redirect('/login')
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-stone-200 bg-white md:flex">
        <Link href="/" className="flex items-center gap-2 px-5 py-4 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-emerald-700 text-sm text-white">LP</span>
          La Parada Digital
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {menu.filter((m) => puedeAcceder(u.rol, m.modulo)).map(({ href, texto, icono: Icono }) => (
            <Link key={href} href={href} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-stone-700 hover:bg-emerald-50 hover:text-emerald-900">
              <Icono className="size-4" /> {texto}
            </Link>
          ))}
        </nav>
        <div className="border-t border-stone-200 p-4 text-sm">
          <p className="font-medium">{u.nombre}</p>
          <p className="text-xs capitalize text-stone-500">{u.rol}</p>
          <form action={cerrarSesion} className="mt-3">
            <button className="flex items-center gap-1 text-xs text-stone-500 hover:text-red-600"><LogOut className="size-3" /> Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <div className="flex-1">
        <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 md:hidden">
          <span className="font-semibold">La Parada Digital</span>
          <span className="text-xs capitalize text-stone-500">{u.rol}</span>
        </div>
        <nav className="flex gap-2 overflow-x-auto border-b border-stone-200 bg-white px-4 py-2 md:hidden">
          {menu.filter((m) => puedeAcceder(u.rol, m.modulo)).map(({ href, texto }) => (
            <Link key={href} href={href} className="whitespace-nowrap rounded-md bg-stone-100 px-3 py-1 text-xs">{texto}</Link>
          ))}
        </nav>
        <main className="mx-auto max-w-6xl p-6">{children}</main>
      </div>
    </div>
  )
}
