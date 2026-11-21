// E1 · HU02 — Gestión de roles (solo administrador; reforzado con RLS y trigger en la BD)
import { exigir } from '@/lib/guardia'
import { cambiarRol } from '../acciones'
import { ROLES } from '@/lib/reglas'
import { AccesoDenegado } from '@/components/acceso-denegado'
import { Encabezado, Tarjeta, Selector, Boton, Aviso, Tabla, td, type Busqueda } from '@/components/ui-parada'

export default async function Usuarios({ searchParams }: { searchParams: Busqueda }) {
  const { ok, error } = await searchParams
  const { u, permitido, sb } = await exigir('usuarios')
  if (!permitido) return <AccesoDenegado />
  const { data } = await sb.from('perfiles').select('id, nombre, email, rol, created_at').order('created_at')

  return (
    <>
      <Encabezado titulo="Usuarios y roles" descripcion="Cada rol accede solo a los módulos que le corresponden" />
      <Aviso ok={ok} error={error} />
      <Tarjeta>
        <Tabla columnas={['Nombre', 'Correo', 'Rol']}>
          {(data ?? []).map((p) => (
            <tr key={p.id}>
              <td className={td}>{p.nombre}</td>
              <td className={td}>{p.email}</td>
              <td className={td}>
                {p.id === u.id ? <span className="text-xs capitalize text-stone-500">{p.rol} (tú)</span> : (
                  <form action={cambiarRol} className="flex gap-1">
                    <input type="hidden" name="id" value={p.id} />
                    <Selector name="rol" defaultValue={p.rol} className="h-8 text-xs" opciones={ROLES.map((r) => ({ valor: r, texto: r }))} />
                    <Boton type="submit" variante="secundario" className="h-8 px-2 text-xs">Guardar</Boton>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </Tabla>
      </Tarjeta>
    </>
  )
}
