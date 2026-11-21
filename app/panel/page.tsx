// HU20 · Dashboard de indicadores (admin/fiscalizador) y resumen por rol para los demás.
import Link from 'next/link'
import { exigir } from '@/lib/guardia'
import { calcularIndicadores, type Prioridad } from '@/lib/reglas'
import { Encabezado, Kpi, Tarjeta, Etiqueta } from '@/components/ui-parada'

export default async function Dashboard() {
  const { u, sb } = await exigir('dashboard')

  const [com, pue, ord, inc] = await Promise.all([
    sb.from('comerciantes').select('estado'),
    sb.from('puestos').select('estado'),
    sb.from('ordenes_estibaje').select('estado, monto'),
    sb.from('incidencias').select('estado, prioridad'),
  ])
  const k = calcularIndicadores({
    comerciantes: com.data ?? [],
    puestos: pue.data ?? [],
    ordenes: (ord.data ?? []).map((o) => ({ estado: o.estado, monto: Number(o.monto) })),
    incidencias: (inc.data ?? []) as { estado: string; prioridad: Prioridad }[],
  })

  const vistaGeneral = u.rol === 'admin' || u.rol === 'fiscalizador'
  const accesos: Record<string, { href: string; texto: string }[]> = {
    comerciante: [{ href: '/panel/comerciantes', texto: 'Mi registro de formalización' }, { href: '/panel/estibaje', texto: 'Solicitar estibaje' }, { href: '/panel/salubridad', texto: 'Reportar incidencia' }],
    estibador: [{ href: '/panel/estibaje', texto: 'Ver órdenes de estibaje' }],
    transportista: [{ href: '/panel/citas', texto: 'Reservar franja de descarga' }],
  }

  return (
    <>
      <Encabezado titulo={`Hola, ${u.nombre.split(' ')[0] || 'usuario'}`}
        descripcion={vistaGeneral ? 'Indicadores de formalización y operación del mercado' : 'Tu resumen en La Parada Digital'} />
      {vistaGeneral ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi titulo="Comerciantes formalizados" valor={`${k.pctFormalizados}%`} detalle={`${k.formalizados} de ${k.totalComerciantes} registrados`} />
            <Kpi titulo="Ocupación de puestos" valor={`${k.pctOcupacion}%`} detalle={`${k.puestosOcupados} de ${k.totalPuestos} puestos`} tono="sky" />
            <Kpi titulo="Estibaje formal" valor={`S/ ${k.montoEstibaje.toFixed(2)}`} detalle={`${k.ordenesCompletadas} órdenes completadas · ${k.ordenesPendientes} pendientes`} tono="amber" />
            <Kpi titulo="Incidencias abiertas" valor={k.incidenciasAbiertas} detalle={`${k.porPrioridad.critica} ${k.porPrioridad.critica === 1 ? "crítica" : "críticas"}`} tono="red" />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Tarjeta titulo="Incidencias abiertas por prioridad">
              <div className="space-y-3">
                {(['critica', 'alta', 'media', 'baja'] as Prioridad[]).map((p) => {
                  const n = k.porPrioridad[p]
                  const ancho = k.incidenciasAbiertas ? (n / k.incidenciasAbiertas) * 100 : 0
                  return (
                    <div key={p} className="flex items-center gap-3 text-sm">
                      <span className="w-16"><Etiqueta valor={p} /></span>
                      <div className="h-2 flex-1 rounded-full bg-stone-100"><div className="h-2 rounded-full bg-emerald-700" style={{ width: `${ancho}%` }} /></div>
                      <span className="w-6 text-right font-medium">{n}</span>
                    </div>
                  )
                })}
              </div>
            </Tarjeta>
            <Tarjeta titulo="Avance de la formalización" descripcion="Meta municipal: 80% de comerciantes formalizados">
              <div className="h-4 rounded-full bg-stone-100">
                <div className="h-4 rounded-full bg-emerald-600" style={{ width: `${k.pctFormalizados}%` }} />
              </div>
              <p className="mt-2 text-sm text-stone-600">{k.pctFormalizados}% formalizado · faltan {Math.max(0, 80 - k.pctFormalizados)} puntos para la meta</p>
            </Tarjeta>
          </div>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {(accesos[u.rol] ?? []).map((a) => (
            <Link key={a.href} href={a.href} className="rounded-xl border border-stone-200 bg-white p-5 font-medium shadow-sm hover:border-emerald-600">
              {a.texto} →
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
