import Link from 'next/link'
import { ShieldCheck, Store, Truck, HardHat, Stethoscope, ArrowRight } from 'lucide-react'
import { crearClienteServidor, supabaseConfigurado } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const pilares = [
  { icono: Store, titulo: 'Comerciantes y puestos formalizados', texto: 'Padrón con DNI/RUC validado, estados de formalización y asignación de puestos por pabellón.' },
  { icono: HardHat, titulo: 'Estibaje sin cupos', texto: 'Estibadores con carné, tarifario oficial público y órdenes trazables con monto calculado en el servidor.' },
  { icono: Truck, titulo: 'Ingreso vehicular ordenado', texto: 'Citas de descarga por franja y zona con aforo máximo y control de ingreso y salida por placa.' },
  { icono: Stethoscope, titulo: 'Salubridad e incidencias', texto: 'Inspecciones por puesto e incidencias priorizadas automáticamente según tipo y gravedad.' },
]

export default async function Inicio() {
  let tarifas: { tipo_carga: string; unidad: string; monto: number }[] = []
  if (supabaseConfigurado()) {
    const sb = await crearClienteServidor()
    const { data } = await sb.from('tarifas').select('tipo_carga, unidad, monto').order('tipo_carga')
    tarifas = data ?? []
  }

  return (
    <main>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-700 text-white">LP</span>
            La Parada Digital
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/consulta" className="text-stone-600 hover:text-stone-900">Comerciantes formalizados</Link>
            <Link href="/login" className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800">Ingresar</Link>
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-b from-emerald-900 to-emerald-800 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-emerald-300">Municipalidad · Mercado mayorista</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">Un mercado formal, trazable y seguro</h1>
            <p className="mt-4 max-w-lg text-emerald-100">
              La Parada concentró por décadas comercio sin registro, caos vehicular, insalubridad y el cobro de cupos en el
              estibaje. Esta plataforma digitaliza cada actor y cada operación para formalizar el mercado sin violencia.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 font-medium text-emerald-900 hover:bg-emerald-50">
                Ingresar al panel <ArrowRight className="size-4" />
              </Link>
              <Link href="/consulta" className="rounded-md border border-emerald-400 px-5 py-2.5 font-medium hover:bg-emerald-700">
                Consultar formalizados
              </Link>
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 p-6 ring-1 ring-white/20">
            <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5 text-emerald-300" /> Tarifario oficial de estibaje</h2>
            <p className="mt-1 text-sm text-emerald-200">Ningún estibador puede cobrar más que esta tarifa. Cualquier cobro de cupo se reporta como incidencia de seguridad.</p>
            <ul className="mt-4 divide-y divide-white/10 text-sm">
              {tarifas.length === 0 && <li className="py-2 text-emerald-200">Tarifario no disponible</li>}
              {tarifas.map((t) => (
                <li key={t.tipo_carga} className="flex justify-between py-2">
                  <span>{t.tipo_carga} <span className="text-emerald-300">/ {t.unidad}</span></span>
                  <span className="font-semibold">S/ {Number(t.monto).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="text-2xl font-semibold">Cuatro frentes contra la informalidad</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {pilares.map(({ icono: Icono, titulo, texto }) => (
            <article key={titulo} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <Icono className="size-6 text-emerald-700" />
              <h3 className="mt-3 font-semibold">{titulo}</h3>
              <p className="mt-1 text-sm text-stone-600">{texto}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-500">
        La Parada Digital · Proyecto Final de Carrera III · USIL 2026-2 · ODS 8, 11 y 16
      </footer>
    </main>
  )
}
