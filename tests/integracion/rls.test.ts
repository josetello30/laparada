// Pruebas de integración: aplicación ↔ Supabase (Auth + PostgREST + RLS + triggers).
// Se ejecutan en el pipeline con los secretos SUPABASE_URL / SUPABASE_ANON_KEY / DEMO_PASSWORD.
// Sin esas variables se omiten (por ejemplo, en un fork sin secretos).
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const pass = process.env.DEMO_PASSWORD
const habilitado = Boolean(url && key && pass)

async function sesion(email: string) {
  const sb = createClient(url!, key!, { auth: { persistSession: false } })
  const { error } = await sb.auth.signInWithPassword({ email, password: pass! })
  if (error) throw error
  return sb
}

describe.skipIf(!habilitado)('Integración Supabase · RLS por rol', { timeout: 20000 }, () => {
  it('HU01 · rechaza credenciales incorrectas', async () => {
    const sb = createClient(url!, key!, { auth: { persistSession: false } })
    const { error } = await sb.auth.signInWithPassword({ email: 'admin@laparada.pe', password: 'incorrecta123' })
    expect(error?.status).toBe(400) // credenciales inválidas, no un error de red
  })

  it('HU22 · un visitante anónimo no lee el padrón, pero sí la consulta pública sin datos sensibles', async () => {
    const anon = createClient(url!, key!, { auth: { persistSession: false } })
    const { data: padron } = await anon.from('comerciantes').select('*')
    expect(padron ?? []).toHaveLength(0)
    const { data: publicos, error } = await anon.rpc('comerciantes_publicos', { p_rubro: null })
    expect(error).toBeNull()
    expect(publicos!.length).toBeGreaterThan(0)
    expect(Object.keys(publicos![0])).not.toContain('num_doc')
    expect(Object.keys(publicos![0])).not.toContain('telefono')
  })

  it('HU03 · el comerciante solo ve su propio registro', async () => {
    const sb = await sesion('comerciante@laparada.pe')
    const { data } = await sb.from('comerciantes').select('nombre_comercial')
    expect(data).toHaveLength(1)
  })

  it('HU03 · el admin ve todo el padrón', async () => {
    const sb = await sesion('admin@laparada.pe')
    const { data } = await sb.from('comerciantes').select('id')
    expect(data!.length).toBeGreaterThan(1)
  })

  it('HU02 · un comerciante no puede cambiarse el rol a admin', async () => {
    const sb = await sesion('comerciante@laparada.pe')
    const { data: u } = await sb.auth.getUser()
    await sb.from('perfiles').update({ rol: 'admin' }).eq('id', u.user!.id)
    const { data } = await sb.from('perfiles').select('rol').eq('id', u.user!.id).single()
    expect(data!.rol).toBe('comerciante')
  })

  it('HU11 · el monto de la orden lo calcula el servidor con la tarifa oficial', async () => {
    const sb = await sesion('admin@laparada.pe')
    const { data } = await sb.from('ordenes_estibaje').select('cantidad, monto, tarifas(monto)').limit(5)
    for (const o of data as unknown as { cantidad: number; monto: number; tarifas: { monto: number } }[]) {
      expect(Number(o.monto)).toBeCloseTo(o.cantidad * Number(o.tarifas.monto), 2)
    }
  })

  it('HU07 · un estibador no puede crear puestos', async () => {
    const sb = await sesion('estibador@laparada.pe')
    const { error } = await sb.from('puestos').insert({ codigo: 'Z-999', pabellon: 'Prueba', rubro: 'Frutas' })
    expect(error).not.toBeNull()
  })
})
