import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Rol } from '@/lib/reglas'

export function supabaseConfigurado() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

/** Cliente de Supabase en el servidor con la sesión del usuario (cookies httpOnly). */
export async function crearClienteServidor() {
  const cookieStore = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // En Server Components no se pueden escribir cookies; el proxy refresca la sesión.
        }
      },
    },
  })
}

export interface Usuario {
  id: string
  email: string
  nombre: string
  rol: Rol
}

/** Usuario autenticado + su rol (desde la tabla perfiles). */
export async function obtenerUsuario(): Promise<Usuario | null> {
  const sb = await crearClienteServidor()
  const { data } = await sb.auth.getUser()
  if (!data.user) return null
  const { data: perfil } = await sb.from('perfiles').select('nombre, rol').eq('id', data.user.id).single()
  return {
    id: data.user.id,
    email: data.user.email ?? '',
    nombre: perfil?.nombre ?? '',
    rol: (perfil?.rol ?? 'comerciante') as Rol,
  }
}
