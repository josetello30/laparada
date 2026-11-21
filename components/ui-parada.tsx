// Componentes de interfaz reutilizables (Tailwind). Server-friendly: sin estado de cliente.
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

export function Tarjeta({ titulo, descripcion, children, className }: {
  titulo?: string; descripcion?: string; children: ReactNode; className?: string
}) {
  return (
    <section className={cn('rounded-xl border border-stone-200 bg-white p-5 shadow-sm', className)}>
      {titulo && <h2 className="text-base font-semibold text-stone-900">{titulo}</h2>}
      {descripcion && <p className="mt-0.5 text-sm text-stone-500">{descripcion}</p>}
      <div className={cn(titulo && 'mt-4')}>{children}</div>
    </section>
  )
}

export function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-stone-700">{label}</span>
      {children}
    </label>
  )
}

const control =
  'h-9 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20'

export function Entrada(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(control, props.className)} />
}

export function Selector({ opciones, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & {
  opciones: { valor: string | number; texto: string }[]
}) {
  return (
    <select {...props} className={cn(control, props.className)}>
      {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
    </select>
  )
}

export function Boton({ variante = 'primario', className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'secundario' | 'peligro'
}) {
  const v = {
    primario: 'bg-emerald-700 text-white hover:bg-emerald-800',
    secundario: 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50',
    peligro: 'bg-red-600 text-white hover:bg-red-700',
  }[variante]
  return <button {...props} className={cn('h-9 rounded-md px-4 text-sm font-medium transition-colors', v, className)} />
}

const colores: Record<string, string> = {
  formalizado: 'bg-emerald-100 text-emerald-800', en_proceso: 'bg-sky-100 text-sky-800',
  pendiente: 'bg-amber-100 text-amber-800', observado: 'bg-red-100 text-red-800',
  disponible: 'bg-emerald-100 text-emerald-800', ocupado: 'bg-stone-200 text-stone-700',
  activo: 'bg-emerald-100 text-emerald-800', suspendido: 'bg-red-100 text-red-800',
  aceptada: 'bg-sky-100 text-sky-800', completada: 'bg-emerald-100 text-emerald-800',
  reservada: 'bg-amber-100 text-amber-800', en_mercado: 'bg-sky-100 text-sky-800', finalizada: 'bg-stone-200 text-stone-700',
  conforme: 'bg-emerald-100 text-emerald-800', no_conforme: 'bg-red-100 text-red-800',
  abierta: 'bg-amber-100 text-amber-800', en_atencion: 'bg-sky-100 text-sky-800', cerrada: 'bg-stone-200 text-stone-700',
  critica: 'bg-red-600 text-white', alta: 'bg-red-100 text-red-800', media: 'bg-amber-100 text-amber-800', baja: 'bg-stone-200 text-stone-700',
}
export function Etiqueta({ valor }: { valor: string }) {
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize', colores[valor] ?? 'bg-stone-100 text-stone-700')}>
      {valor.replace('_', ' ')}
    </span>
  )
}

export function Aviso({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null
  return (
    <div role="status" className={cn('mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm',
      ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900')}>
      {ok ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
      {ok ?? error}
    </div>
  )
}

export function Tabla({ columnas, children, vacio = 'Sin registros' }: {
  columnas: string[]; children: ReactNode; vacio?: string
}) {
  const filas = Array.isArray(children) ? children.length : children ? 1 : 0
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
            {columnas.map((c) => <th key={c} className="px-3 py-2 font-medium">{c}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {filas ? children : (
            <tr><td colSpan={columnas.length} className="px-3 py-6 text-center text-stone-400">{vacio}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
export const td = 'px-3 py-2 align-middle text-stone-800'

export function Encabezado({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{titulo}</h1>
      <p className="mt-1 text-sm text-stone-500">{descripcion}</p>
    </div>
  )
}

export function Kpi({ titulo, valor, detalle, tono = 'emerald' }: {
  titulo: string; valor: string | number; detalle?: string; tono?: 'emerald' | 'amber' | 'sky' | 'red'
}) {
  const barra = { emerald: 'bg-emerald-600', amber: 'bg-amber-500', sky: 'bg-sky-600', red: 'bg-red-600' }[tono]
  return (
    <div className="relative overflow-hidden rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className={cn('absolute inset-y-0 left-0 w-1', barra)} />
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold text-stone-900">{valor}</p>
      {detalle && <p className="text-xs text-stone-500">{detalle}</p>}
    </div>
  )
}

export type Busqueda = Promise<{ ok?: string; error?: string; [k: string]: string | undefined }>
