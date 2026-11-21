import { redirect } from 'next/navigation'
import { obtenerUsuario, crearClienteServidor } from '@/lib/supabase/server'
import { puedeAcceder, type Modulo } from '@/lib/reglas'

/** HU03 · Verifica sesión y permiso del rol para un módulo antes de renderizar la página. */
export async function exigir(modulo: Modulo) {
  const u = await obtenerUsuario()
  if (!u) redirect('/login')
  const permitido = puedeAcceder(u.rol, modulo)
  return { u, permitido, sb: await crearClienteServidor() }
}
