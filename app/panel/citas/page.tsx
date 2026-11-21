// E4 · HU14–HU16 — Citas de descarga con aforo por franja y zona, control de ingreso/salida
import { exigir } from '@/lib/guardia'
import { reservarCita, avanzarCita } from '../acciones'
import { FRANJAS, cuposDisponibles } from '@/lib/reglas'
import { AccesoDenegado } from '@/components/acceso-denegado'
import { Encabezado, Tarjeta, Campo, Entrada, Selector, Boton, Aviso, Tabla, td, Etiqueta, type Busqueda } from '@/components/ui-parada'

const hoyLima = () => new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10)

export default async function Citas({ searchParams }: { searchParams: Busqueda }) {
  const sp = await searchParams
  const fecha = sp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : hoyLima()
  const { u, permitido, sb } = await exigir('citas')
  if (!permitido) return <AccesoDenegado />
  const controla = u.rol === 'fiscalizador' || u.rol === 'admin'

  const [{ data: zonas }, { data: citasRaw }] = await Promise.all([
    sb.from('zonas').select('id, nombre, aforo').order('nombre'),
    sb.from('citas').select('id, fecha, franja, placa, estado, ingreso_at, salida_at, zona_id, zonas(nombre)').order('fecha').order('franja'),
  ])
  const citas = citasRaw ?? []
  // HU15 · Cupos por zona y franja para la fecha seleccionada (solo visibles completos para quien controla)
  const ocupadas = (z: number, f: string) => citas.filter((c) => c.zona_id === z && c.franja === f && c.fecha === fecha && c.estado !== 'finalizada').length

  return (
    <>
      <Encabezado titulo="Citas de descarga" descripcion="Distribuye la llegada de camiones por franja y zona para evitar el caos vehicular" />
      <Aviso ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-3">
        {(u.rol === 'transportista' || u.rol === 'admin') && (
          <Tarjeta titulo="Reservar franja">
            <form action={reservarCita} className="flex flex-col gap-3">
              <Campo label="Zona de descarga"><Selector name="zona_id" opciones={(zonas ?? []).map((z) => ({ valor: z.id, texto: `${z.nombre} (aforo ${z.aforo})` }))} /></Campo>
              <Campo label="Fecha"><Entrada name="fecha" type="date" required defaultValue={fecha} min={hoyLima()} /></Campo>
              <Campo label="Franja horaria"><Selector name="franja" opciones={FRANJAS.map((f) => ({ valor: f, texto: f }))} /></Campo>
              <Campo label="Placa del vehículo"><Entrada name="placa" required placeholder="ABC-123" maxLength={7} /></Campo>
              <Boton type="submit">Reservar</Boton>
            </form>
          </Tarjeta>
        )}
        {controla && (
          <Tarjeta titulo="Ocupación por franja" className="lg:col-span-2" descripcion="Cupos libres / aforo máximo">
            <form className="mb-3 flex items-end gap-2">
              <Campo label="Fecha"><Entrada name="fecha" type="date" defaultValue={fecha} /></Campo>
              <Boton type="submit" variante="secundario">Ver</Boton>
            </form>
            <Tabla columnas={['Zona', ...FRANJAS]}>
              {(zonas ?? []).map((z) => (
                <tr key={z.id}>
                  <td className={`${td} font-medium`}>{z.nombre}</td>
                  {FRANJAS.map((f) => {
                    const libres = cuposDisponibles(ocupadas(z.id, f), z.aforo)
                    return <td key={f} className={td}><span className={libres === 0 ? 'font-semibold text-red-600' : 'text-emerald-700'}>{libres === 0 ? 'Llena' : `${libres}/${z.aforo}`}</span></td>
                  })}
                </tr>
              ))}
            </Tabla>
          </Tarjeta>
        )}
      </div>
      <Tarjeta titulo={controla ? 'Control de ingreso y salida' : 'Mis citas'} className="mt-6">
        <Tabla columnas={['Fecha', 'Franja', 'Zona', 'Placa', 'Estado', 'Ingreso', 'Salida', ...(controla ? ['Acción'] : [])]} vacio="Sin citas">
          {citas.map((c) => {
            const z = (Array.isArray(c.zonas) ? c.zonas[0] : c.zonas) as { nombre?: string } | null
            const hora = (t: string | null) => (t ? new Date(t).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' }) : '—')
            return (
              <tr key={c.id}>
                <td className={td}>{c.fecha}</td>
                <td className={td}>{c.franja}</td>
                <td className={td}>{z?.nombre}</td>
                <td className={`${td} font-mono`}>{c.placa}</td>
                <td className={td}><Etiqueta valor={c.estado} /></td>
                <td className={td}>{hora(c.ingreso_at)}</td>
                <td className={td}>{hora(c.salida_at)}</td>
                {controla && (
                  <td className={td}>
                    {c.estado !== 'finalizada' && (
                      <form action={avanzarCita}>
                        <input type="hidden" name="id" value={c.id} />
                        <Boton type="submit" variante="secundario" className="h-8 px-2 text-xs">{c.estado === 'reservada' ? 'Registrar ingreso' : 'Registrar salida'}</Boton>
                      </form>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </Tabla>
      </Tarjeta>
    </>
  )
}
