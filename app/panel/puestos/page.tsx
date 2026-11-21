// E2 · HU07, HU08 — Registro de puestos y asignación a comerciantes formalizados
import { exigir } from '@/lib/guardia'
import { registrarPuesto, asignarPuesto, liberarPuesto } from '../acciones'
import { AccesoDenegado } from '@/components/acceso-denegado'
import { Encabezado, Tarjeta, Campo, Entrada, Selector, Boton, Aviso, Tabla, td, Etiqueta, Kpi, type Busqueda } from '@/components/ui-parada'

export default async function Puestos({ searchParams }: { searchParams: Busqueda }) {
  const { ok, error } = await searchParams
  const { u, permitido, sb } = await exigir('puestos')
  if (!permitido) return <AccesoDenegado />
  const esAdmin = u.rol === 'admin'

  const [{ data: puestos }, { data: formalizados }] = await Promise.all([
    sb.from('puestos').select('id, codigo, pabellon, rubro, estado, comerciantes(nombre_comercial)').order('codigo'),
    sb.from('comerciantes').select('id, nombre_comercial, puestos(id)').eq('estado', 'formalizado').order('nombre_comercial'),
  ])
  const lista = puestos ?? []
  const sinPuesto = (formalizados ?? []).filter((c) => !c.puestos || (Array.isArray(c.puestos) && c.puestos.length === 0))
  const ocupados = lista.filter((p) => p.estado === 'ocupado').length

  return (
    <>
      <Encabezado titulo="Puestos del mercado" descripcion="Ordenamiento físico por pabellón y control de ocupación" />
      <Aviso ok={ok} error={error} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Kpi titulo="Puestos registrados" valor={lista.length} />
        <Kpi titulo="Ocupados" valor={ocupados} tono="sky" />
        <Kpi titulo="Disponibles" valor={lista.length - ocupados} tono="amber" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {esAdmin && (
          <Tarjeta titulo="Nuevo puesto">
            <form action={registrarPuesto} className="flex flex-col gap-3">
              <Campo label="Código (A-101)"><Entrada name="codigo" required pattern="[A-Za-z]-[0-9]{3}" placeholder="A-104" /></Campo>
              <Campo label="Pabellón"><Entrada name="pabellon" required placeholder="Pabellón A" /></Campo>
              <Campo label="Rubro"><Selector name="rubro" opciones={['Frutas', 'Verduras', 'Tubérculos', 'Abarrotes'].map((r) => ({ valor: r, texto: r }))} /></Campo>
              <Boton type="submit">Registrar puesto</Boton>
            </form>
          </Tarjeta>
        )}
        <Tarjeta titulo="Puestos" className={esAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <Tabla columnas={['Código', 'Pabellón', 'Rubro', 'Estado', 'Comerciante', ...(esAdmin ? ['Acción'] : [])]}>
            {lista.map((p) => {
              const com = (Array.isArray(p.comerciantes) ? p.comerciantes[0] : p.comerciantes) as { nombre_comercial?: string } | null
              return (
                <tr key={p.id}>
                  <td className={`${td} font-medium`}>{p.codigo}</td>
                  <td className={td}>{p.pabellon}</td>
                  <td className={td}>{p.rubro}</td>
                  <td className={td}><Etiqueta valor={p.estado} /></td>
                  <td className={td}>{com?.nombre_comercial ?? '—'}</td>
                  {esAdmin && (
                    <td className={td}>
                      {p.estado === 'disponible' ? (
                        sinPuesto.length ? (
                          <form action={asignarPuesto} className="flex gap-1">
                            <input type="hidden" name="puesto_id" value={p.id} />
                            <Selector name="comerciante_id" className="h-8 text-xs" opciones={sinPuesto.map((c) => ({ valor: c.id, texto: c.nombre_comercial }))} />
                            <Boton type="submit" variante="secundario" className="h-8 px-2 text-xs">Asignar</Boton>
                          </form>
                        ) : <span className="text-xs text-stone-400">Sin formalizados sin puesto</span>
                      ) : (
                        <form action={liberarPuesto}>
                          <input type="hidden" name="puesto_id" value={p.id} />
                          <Boton type="submit" variante="secundario" className="h-8 px-2 text-xs">Liberar</Boton>
                        </form>
                      )}
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
