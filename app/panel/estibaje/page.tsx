// E3 · HU09–HU13 — Estibaje trazable: carné, tarifario oficial, órdenes e historial
import { exigir } from '@/lib/guardia'
import { registrarEstibador, cambiarEstadoEstibador, registrarTarifa, solicitarOrden, avanzarOrden } from '../acciones'
import { AccesoDenegado } from '@/components/acceso-denegado'
import { Encabezado, Tarjeta, Campo, Entrada, Selector, Boton, Aviso, Tabla, td, Etiqueta, type Busqueda } from '@/components/ui-parada'

type Orden = {
  id: number; cantidad: number; monto: number; estado: 'pendiente' | 'aceptada' | 'completada'; created_at: string
  estibador_id: number | null
  tarifas: { tipo_carga: string } | null; comerciantes: { nombre_comercial: string } | null; estibadores: { nombre: string; carne: string } | null
}
const uno = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)
const soles = (n: number) => `S/ ${Number(n).toFixed(2)}`

export default async function Estibaje({ searchParams }: { searchParams: Busqueda }) {
  const { ok, error } = await searchParams
  const { u, permitido, sb } = await exigir('estibaje')
  if (!permitido) return <AccesoDenegado />

  const [{ data: tarifas }, { data: estibadores }, { data: ordenesRaw }] = await Promise.all([
    sb.from('tarifas').select('id, tipo_carga, unidad, monto').order('tipo_carga'),
    sb.from('estibadores').select('id, nombre, dni, carne, estado, user_id').order('carne'),
    sb.from('ordenes_estibaje')
      .select('id, cantidad, monto, estado, created_at, estibador_id, tarifas(tipo_carga), comerciantes(nombre_comercial), estibadores(nombre, carne)')
      .order('created_at', { ascending: false }),
  ])
  const ordenes = (ordenesRaw ?? []).map((o) => ({
    ...o, tarifas: uno(o.tarifas), comerciantes: uno(o.comerciantes), estibadores: uno(o.estibadores),
  })) as unknown as Orden[]
  const yo = (estibadores ?? []).find((e) => e.user_id === u.id)

  // HU13 · Historial por estibador (órdenes completadas y monto)
  const historial = (estibadores ?? []).map((e) => {
    const suyas = ordenes.filter((o) => o.estibador_id === e.id && o.estado === 'completada')
    return { ...e, n: suyas.length, total: suyas.reduce((s, o) => s + Number(o.monto), 0) }
  })

  const tablaOrdenes = (lista: Orden[], acciones: boolean) => (
    <Tabla columnas={['#', 'Comerciante', 'Carga', 'Cant.', 'Monto', 'Estibador', 'Estado', ...(acciones ? ['Acción'] : [])]} vacio="Sin órdenes">
      {lista.map((o) => (
        <tr key={o.id}>
          <td className={td}>{o.id}</td>
          <td className={td}>{o.comerciantes?.nombre_comercial ?? '—'}</td>
          <td className={td}>{o.tarifas?.tipo_carga}</td>
          <td className={td}>{o.cantidad}</td>
          <td className={`${td} font-medium`}>{soles(o.monto)}</td>
          <td className={td}>{o.estibadores ? `${o.estibadores.nombre} (${o.estibadores.carne})` : '—'}</td>
          <td className={td}><Etiqueta valor={o.estado} /></td>
          {acciones && (
            <td className={td}>
              {o.estado !== 'completada' && (o.estado === 'pendiente' || o.estibador_id === yo?.id) && (
                <form action={avanzarOrden}>
                  <input type="hidden" name="id" value={o.id} />
                  <Boton type="submit" variante="secundario" className="h-8 px-2 text-xs">
                    {o.estado === 'pendiente' ? 'Aceptar' : 'Marcar completada'}
                  </Boton>
                </form>
              )}
            </td>
          )}
        </tr>
      ))}
    </Tabla>
  )

  return (
    <>
      <Encabezado titulo="Estibaje trazable" descripcion="Servicio de carga a tarifa oficial, con estibadores registrados y sin cobro de cupos" />
      <Aviso ok={ok} error={error} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Tarjeta titulo="Tarifario oficial" descripcion="Monto por unidad · publicado por la Municipalidad">
          <ul className="divide-y divide-stone-100 text-sm">
            {(tarifas ?? []).map((t) => (
              <li key={t.id} className="flex justify-between py-2"><span>{t.tipo_carga} <span className="text-stone-400">/ {t.unidad}</span></span><span className="font-semibold">{soles(t.monto)}</span></li>
            ))}
          </ul>
          {u.rol === 'admin' && (
            <form action={registrarTarifa} className="mt-4 grid grid-cols-2 gap-2 border-t border-stone-100 pt-4">
              <div className="col-span-2"><Campo label="Tipo de carga"><Entrada name="tipo_carga" required placeholder="Camote (saco 50 kg)" /></Campo></div>
              <Campo label="Unidad"><Selector name="unidad" opciones={['saco', 'jaba', 'caja'].map((x) => ({ valor: x, texto: x }))} /></Campo>
              <Campo label="Monto S/"><Entrada name="monto" type="number" step="0.10" min="0.10" required /></Campo>
              <Boton type="submit" className="col-span-2">Publicar tarifa</Boton>
            </form>
          )}
        </Tarjeta>

        {u.rol === 'comerciante' && (
          <Tarjeta titulo="Solicitar orden de estibaje" descripcion="El monto se calcula con la tarifa oficial" className="lg:col-span-2">
            <form action={solicitarOrden} className="flex flex-wrap items-end gap-3">
              <Campo label="Tipo de carga"><Selector name="tarifa_id" opciones={(tarifas ?? []).map((t) => ({ valor: t.id, texto: `${t.tipo_carga} · ${soles(t.monto)}` }))} /></Campo>
              <Campo label="Cantidad"><Entrada name="cantidad" type="number" min={1} max={1000} required className="w-28" /></Campo>
              <Boton type="submit">Solicitar</Boton>
            </form>
            <div className="mt-5">{tablaOrdenes(ordenes, false)}</div>
          </Tarjeta>
        )}

        {u.rol === 'estibador' && (
          <Tarjeta titulo={`Órdenes · ${yo ? `carné ${yo.carne}` : 'sin carné vinculado'}`} className="lg:col-span-2"
            descripcion={yo?.estado === 'suspendido' ? 'Tu carné está suspendido: no puedes aceptar órdenes' : 'Acepta órdenes pendientes y márcalas al terminar'}>
            {tablaOrdenes(ordenes, true)}
          </Tarjeta>
        )}

        {u.rol === 'admin' && (
          <Tarjeta titulo="Registrar estibador" descripcion="Se genera un carné único" className="lg:col-span-2">
            <form action={registrarEstibador} className="flex flex-wrap items-end gap-3">
              <Campo label="Nombre completo"><Entrada name="nombre" required minLength={3} /></Campo>
              <Campo label="DNI"><Entrada name="dni" required inputMode="numeric" maxLength={8} className="w-32" /></Campo>
              <Boton type="submit">Registrar</Boton>
            </form>
            <div className="mt-5">
              <Tabla columnas={['Carné', 'Estibador', 'DNI', 'Estado', 'Órdenes completadas', 'Monto acumulado', 'Acción']}>
                {historial.map((e) => (
                  <tr key={e.id}>
                    <td className={`${td} font-mono text-xs`}>{e.carne}</td>
                    <td className={td}>{e.nombre}</td>
                    <td className={td}>{e.dni}</td>
                    <td className={td}><Etiqueta valor={e.estado} /></td>
                    <td className={td}>{e.n}</td>
                    <td className={`${td} font-medium`}>{soles(e.total)}</td>
                    <td className={td}>
                      <form action={cambiarEstadoEstibador}>
                        <input type="hidden" name="id" value={e.id} />
                        <input type="hidden" name="estado" value={e.estado === 'activo' ? 'suspendido' : 'activo'} />
                        <Boton type="submit" variante="secundario" className="h-8 px-2 text-xs">{e.estado === 'activo' ? 'Suspender' : 'Activar'}</Boton>
                      </form>
                    </td>
                  </tr>
                ))}
              </Tabla>
            </div>
          </Tarjeta>
        )}
      </div>

      {u.rol === 'admin' && (
        <Tarjeta titulo="Todas las órdenes de estibaje" className="mt-6">{tablaOrdenes(ordenes, false)}</Tarjeta>
      )}
    </>
  )
}
