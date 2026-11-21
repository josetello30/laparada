'use server'
import { redirect } from 'next/navigation'
import { crearClienteServidor } from '@/lib/supabase/server'
import { loginSchema, registroSchema, parsear } from '@/lib/esquemas'

const msg = (ruta: string, tipo: 'ok' | 'error', texto: string) =>
  redirect(`${ruta}?${tipo}=${encodeURIComponent(texto)}`)

export async function iniciarSesion(fd: FormData) {
  const r = parsear(loginSchema, fd)
  if (!r.ok) msg('/login', 'error', r.error)
  const sb = await crearClienteServidor()
  const { error } = await sb.auth.signInWithPassword(r.ok ? r.data : { email: '', password: '' })
  // Mensaje genérico: no revela si el correo existe (evita enumeración de usuarios)
  if (error) msg('/login', 'error', 'Correo o contraseña incorrectos')
  redirect('/panel')
}

export async function registrarse(fd: FormData) {
  const r = parsear(registroSchema, fd)
  if (!r.ok) return msg('/login', 'error', r.error)
  const sb = await crearClienteServidor()
  const { data, error } = await sb.auth.signUp({
    email: r.data.email,
    password: r.data.password,
    options: { data: { nombre: r.data.nombre } },
  })
  if (error) return msg('/login', 'error', 'No se pudo crear la cuenta: ' + error.message)
  if (!data.session) return msg('/login', 'ok', 'Cuenta creada. Revisa tu correo para confirmarla.')
  redirect('/panel')
}

export async function cerrarSesion() {
  const sb = await crearClienteServidor()
  await sb.auth.signOut()
  redirect('/login?ok=' + encodeURIComponent('Sesión cerrada'))
}
