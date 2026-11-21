// HU22 · Consulta pública: solo comerciantes formalizados y sin datos sensibles (función SQL comerciantes_publicos).
import Link from 'next/link'
import { crearClienteServidor, supabaseConfigurado } from '@/lib/supabase/server'
import { Tarjeta, Tabla, td, Selector, Boton } from '@/components/ui-parada'

export const dynamic = 'force-dynamic'

export default async function Consulta({ searchParams }: { searchParams: Promise<{ rubro?: string }> }) {
  const { rubro = '' } = await searchParams
  let filas: { nombre_comercial: string; rubro: string; puesto: string | null; pabellon: string | null }[] = []
  if (supabaseConfigurado()) {
    const sb = await crearClienteServidor()
    const { data } = await sb.rpc('comerciantes_publicos', { p_rubro: rubro || null })
    filas = data ?? []
  }
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/" className="text-sm text-emerald-700 hover:underline">← Inicio</Link>
      <h1 className="mt-2 text-2xl font-semibold">Comerciantes formalizados</h1>
      <p className="mt-1 text-sm text-stone-500">Compra con confianza: estos negocios cumplen con el registro municipal.</p>
      <Tarjeta className="mt-6">
        <form className="mb-4 flex items-end gap-3">
          <Selector name="rubro" defaultValue={rubro} opciones={[
            { valor: '', texto: 'Todos los rubros' }, { valor: 'Frutas', texto: 'Frutas' },
            { valor: 'Verduras', texto: 'Verduras' }, { valor: 'Tubérculos', texto: 'Tubérculos' }, { valor: 'Abarrotes', texto: 'Abarrotes' },
          ]} />
          <Boton type="submit" variante="secundario">Filtrar</Boton>
        </form>
        <Tabla columnas={['Negocio', 'Rubro', 'Puesto', 'Pabellón']} vacio="No hay comerciantes formalizados en este rubro">
          {filas.map((f) => (
            <tr key={f.nombre_comercial}>
              <td className={td}>{f.nombre_comercial}</td>
              <td className={td}>{f.rubro}</td>
              <td className={td}>{f.puesto ?? '—'}</td>
              <td className={td}>{f.pabellon ?? '—'}</td>
            </tr>
          ))}
        </Tabla>
      </Tarjeta>
    </main>
  )
}
