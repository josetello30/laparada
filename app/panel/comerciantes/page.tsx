// E2 · HU04, HU05, HU06 — Padrón de comerciantes y estado de formalización
import { exigir } from '@/lib/guardia'
import { registrarComerciante, cambiarEstadoComerciante } from '../acciones'
import { AccesoDenegado } from '@/components/acceso-denegado'
import { Encabezado, Tarjeta, Campo, Entrada, Selector, Boton, Aviso, Tabla, td, Etiqueta, type Busqueda } from '@/components/ui-parada'

const rubros = ['Frutas', 'Verduras', 'Tubérculos', 'Abarrotes'].map((r) => ({ valor: r, texto: r }))
const estados = [
  { valor: 'pendiente', texto: 'Pendiente' }, { valor: 'en_proceso', texto: 'En proceso' },
  { valor: 'formalizado', texto: 'Formalizado' }, { valor: 'observado', texto: 'Observado' },
]

export default async function Comerciantes({ searchParams }: { searchParams: Busqueda }) {
  const { ok, error } = await searchParams
  const { u, permitido, sb } = await exigir('comerciantes')
  if (!permitido) return <AccesoDenegado />

  const { data: lista } = await sb.from('comerciantes')
    .select('id, nombre_comercial, tipo_doc, num_doc, rubro, telefono, estado, observacion, puestos(codigo)')
    .order('created_at', { ascending: false })
  const filas = lista ?? []
  const esAdmin = u.rol === 'admin'
  const puedeRegistrar = esAdmin || (u.rol === 'comerciante' && filas.length === 0)

  return (
    <>
      <Encabezado titulo={u.rol === 'comerciante' ? 'Mi formalización' : 'Padrón de comerciantes'}
        descripcion="Registro con DNI/RUC validado y seguimiento del estado de formalización" />
      <Aviso ok={ok} error={error} />
      <div className="grid gap-6 lg:grid-cols-3">
        {puedeRegistrar && (
          <Tarjeta titulo="Registrar negocio" descripcion="Inicia con estado Pendiente">
            <form action={registrarComerciante} className="flex flex-col gap-3">
              <Campo label="Nombre comercial"><Entrada name="nombre_comercial" required minLength={3} /></Campo>
              <div className="grid grid-cols-3 gap-2">
                <Campo label="Tipo"><Selector name="tipo_doc" opciones={[{ valor: 'DNI', texto: 'DNI' }, { valor: 'RUC', texto: 'RUC' }]} /></Campo>
                <div className="col-span-2"><Campo label="Número"><Entrada name="num_doc" required inputMode="numeric" maxLength={11} /></Campo></div>
              </div>
              <Campo label="Rubro"><Selector name="rubro" opciones={rubros} /></Campo>
              <Campo label="Celular"><Entrada name="telefono" required inputMode="numeric" maxLength={9} placeholder="9XXXXXXXX" /></Campo>
              <Boton type="submit">Registrar</Boton>
            </form>
          </Tarjeta>
        )}
        <Tarjeta titulo={`Comerciantes (${filas.length})`} className={puedeRegistrar ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <Tabla columnas={['Negocio', 'Documento', 'Rubro', 'Puesto', 'Estado', ...(esAdmin ? ['Cambiar estado'] : [])]}
            vacio={u.rol === 'comerciante' ? 'Aún no registras tu negocio' : 'Sin comerciantes'}>
            {filas.map((c) => {
              const puesto = Array.isArray(c.puestos) ? c.puestos[0]?.codigo : (c.puestos as { codigo?: string } | null)?.codigo
              return (
                <tr key={c.id}>
                  <td className={td}><p className="font-medium">{c.nombre_comercial}</p><p className="text-xs text-stone-500">{c.telefono}</p></td>
                  <td className={td}>{c.tipo_doc} {c.num_doc}</td>
                  <td className={td}>{c.rubro}</td>
                  <td className={td}>{puesto ?? '—'}</td>
                  <td className={td}><Etiqueta valor={c.estado} />{c.observacion && <p className="mt-1 text-xs text-red-700">{c.observacion}</p>}</td>
                  {esAdmin && (
                    <td className={td}>
                      <form action={cambiarEstadoComerciante} className="flex flex-wrap items-center gap-1">
                        <input type="hidden" name="id" value={c.id} />
                        <Selector name="estado" defaultValue={c.estado} opciones={estados} className="h-8 text-xs" />
                        <Entrada name="observacion" placeholder="Observación" className="h-8 w-32 text-xs" />
                        <Boton type="submit" variante="secundario" className="h-8 px-2 text-xs">Guardar</Boton>
                      </form>
                    </td>
                  )}
                </tr>
              )
            })}
          </Tabla>
        </Tarjeta>
      </div>
    </>
  )
}
