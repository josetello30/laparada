import { ShieldX } from 'lucide-react'

export function AccesoDenegado() {
  return (
    <div className="grid place-items-center rounded-xl border border-red-200 bg-red-50 p-10 text-center">
      <ShieldX className="size-10 text-red-600" />
      <h1 className="mt-3 text-lg font-semibold text-red-900">Acceso denegado</h1>
      <p className="mt-1 text-sm text-red-800">Tu rol no tiene permiso para ver este módulo.</p>
    </div>
  )
}
