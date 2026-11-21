// E5 · HU17–HU19, HU21 — Inspecciones de salubridad e incidencias priorizadas
import { exigir } from '@/lib/guardia'
import { registrarInspeccion, reportarIncidencia, cambiarEstadoIncidencia } from '../acciones'
import { AccesoDenegado } from '@/components/acceso-denegado'
import { Encabezado, Tarjeta, Campo, Entrada, Selector, Boton, Aviso, Tabla, td, Etiqueta, type Busqueda } from '@/components/ui-parada'

const orden = { critica: 0, alta: 1, media: 2, baja: 3 } as const

export default async function Salubridad({ searchParams }: { searchParams: Busqueda }) {
  const { ok, error } = await searchParams
  const { u, permitido, sb } = await exigir('salubridad')
  if (!permitido) return <AccesoDenegado />
  const fiscaliza = u.rol === 'fiscalizador' || u.rol === 'admin'

  const [{ data: puestos }, { data: inspecciones }, { data: incRaw }] = await Promise.all([
    sb.from('puestos').select('id, codigo').order('codigo'),
    fiscaliza
      ? sb.from('inspecciones').select('id, resultado, observaciones, created_at, puestos(codigo)').order('created_at', { ascending: false }).limit(20)
      : Promise.resolve({ data: [] as never[] }),
    sb.from('incidencias').select('id, tipo, gravedad, prioridad, descripcion, estado, created_at, puestos(codigo)'),
  ])
  const incidencias = (incRaw ?? []).sort((a, b) =>
    (a.estado === 'cerrada' ? 1 : 0) - (b.estado === 'cerrada' ? 1 : 0) ||
    orden[a.prioridad as keyof typeof orden] - orden[b.prioridad as keyof typeof orden])
  const opcPuestos = [{ valor: '', texto: 'Sin puesto específico' }, ...(puestos ?? []).map((p) => ({ valor: p.id, texto: p.codigo }))]
  const cod = (v: unknown) => ((Array.isArray(v) ? v[0] : v) as { codigo?: string } | null)?.codigo ?? '—'
  const fecha = (t: string) => new Date(t).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Lima' })

  return (
    <>
      <Encabezado titulo="Salubridad e incidencias" descripcion="Inspecciones sanitarias y reporte de incidencias de salubridad, seguridad (cobro de cupos) y tránsito" />
      <Aviso ok={ok} error={error} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta titulo="Reportar incidencia" descripcion="La prioridad se calcula según tipo y gravedad">
          <form action={reportarIncidencia} className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              <Campo label="Tipo"><Selector name="tipo" opciones={[{ valor: 'seguridad', texto: 'Seguridad' }, { valor: 'salubridad', texto: 'Salubridad' }, { valor: 'transito', texto: 'Tránsito' }]} /></Campo>
              <Campo label="Gravedad"><Selector name="gravedad" opciones={[{ valor: 'baja', texto: 'Baja' }, { valor: 'media', texto: 'Media' }, { valor: 'alta', texto: 'Alta' }]} /></Campo>
              <Campo label="Puesto"><Selector name="puesto_id" opciones={opcPuestos} /></Campo>
            </div>
            <Campo label="Descripción"><textarea name="descripcion" required minLength={10} maxLength={500} rows={3} className="rounded-md border border-stone-300 p-2 text-sm outline-none focus:border-emerald-600" /></Campo>
            <Boton type="submit">Reportar</Boton>
          </form>
        </Tarjeta>
        {fiscaliza && (
          <Tarjeta titulo="Registrar inspección" descripcion="Una inspección No conforme genera una incidencia automáticamente">
            <form action={registrarInspeccion} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Puesto"><Selector name="puesto_id" opciones={(puestos ?? []).map((p) => ({ valor: p.id, texto: p.codigo }))} /></Campo>
                <Campo label="Resultado"><Selector name="resultado" opciones={[{ valor: 'conforme', texto: 'Conforme' }, { valor: 'no_conforme', texto: 'No conforme' }]} /></Campo>
              </div>
              <Campo label="Observaciones"><Entrada name="observaciones" maxLength={300} /></Campo>
              <Boton type="submit">Registrar inspección</Boton>
            </form>
          </Tarjeta>
        )}
      </div>

      <Tarjeta titulo="Incidencias" className="mt-6" descripcion={fiscaliza ? 'Ordenadas por prioridad' : 'Tus reportes'}>
        <Tabla columnas={['Prioridad', 'Tipo', 'Descripción', 'Puesto', 'Fecha', 'Estado', ...(fiscaliza ? ['Seguimiento'] : [])]} vacio="Sin incidencias">
          {incidencias.map((i) => (
            <tr key={i.id}>
              <td className={td}><Etiqueta valor={i.prioridad} /></td>
              <td className={`${td} capitalize`}>{i.tipo === 'transito' ? 'tránsito' : i.tipo}</td>
              <td className={`${td} max-w-xs`}>{i.descripcion}</td>
              <td className={td}>{cod(i.puestos)}</td>
              <td className={`${td} whitespace-nowrap text-xs`}>{fecha(i.created_at)}</td>
              <td className={td}><Etiqueta valor={i.estado} /></td>
              {fiscaliza && (
                <td className={td}>
                  <form action={cambiarEstadoIncidencia} className="flex gap-1">
                    <input type="hidden" name="id" value={i.id} />
                    <Selector name="estado" defaultValue={i.estado} className="h-8 text-xs" opciones={[{ valor: 'abierta', texto: 'Abierta' }, { valor: 'en_atencion', texto: 'En atención' }, { valor: 'cerrada', texto: 'Cerrada' }]} />
                    <Boton type="submit" variante="secundario" className="h-8 px-2 text-xs">OK</Boton>
                  </form>
                </td>
              )}
            </tr>
          ))}
        </Tabla>
      </Tarjeta>

      {fiscaliza && (
        <Tarjeta titulo="Últimas inspecciones" className="mt-6">
          <Tabla columnas={['Fecha', 'Puesto', 'Resultado', 'Observaciones']}>
            {(inspecciones ?? []).map((x) => (
              <tr key={x.id}>
                <td className={`${td} text-xs`}>{fecha(x.created_at)}</td>
                <td className={td}>{cod(x.puestos)}</td>
                <td className={td}><Etiqueta valor={x.resultado} /></td>
                <td className={td}>{x.observaciones}</td>
              </tr>
            ))}
          </Tabla>
        </Tarjeta>
      )}
    </>
  )
}
