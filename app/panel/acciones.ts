'use server'
// Server Actions del panel. Cada acción: 1) valida con Zod, 2) verifica el rol en la app,
// 3) ejecuta con la sesión del usuario — la base de datos vuelve a verificar con RLS (defensa en profundidad).
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { crearClienteServidor, obtenerUsuario } from '@/lib/supabase/server'
import { puedeAcceder, calcularPrioridad, siguienteEstadoOrden, siguienteEstadoCita, type Modulo } from '@/lib/reglas'
import * as E from '@/lib/esquemas'

function volver(ruta: string, tipo: 'ok' | 'error', texto: string): never {
  revalidatePath(ruta)
  redirect(`${ruta}?${tipo}=${encodeURIComponent(texto)}`)
}

async function contexto(modulo: Modulo, ruta: string) {
  const u = await obtenerUsuario()
  if (!u) redirect('/login')
  if (!puedeAcceder(u.rol, modulo)) volver(ruta, 'error', 'Tu rol no tiene permiso para esta acción')
  return { u, sb: await crearClienteServidor() }
}

function errorBD(msg: string) {
  if (msg.includes('duplicate key') && msg.includes('num_doc')) return 'Documento ya registrado'
  if (msg.includes('duplicate key') && msg.includes('codigo')) return 'El código de puesto ya existe'
  if (msg.includes('duplicate key') && msg.includes('dni')) return 'El DNI ya está registrado'
  if (msg.includes('Franja llena')) return 'Franja llena: elige otra franja o zona'
  if (msg.includes('row-level security')) return 'Operación no permitida para tu rol'
  return 'No se pudo guardar: ' + msg
}

// ---------- E1 · Usuarios y roles ----------
export async function cambiarRol(fd: FormData) {
  const ruta = '/panel/usuarios'
  const { u, sb } = await contexto('usuarios', ruta)
  if (u.rol !== 'admin') volver(ruta, 'error', 'Solo el administrador puede cambiar roles')
  const r = E.parsear(E.rolSchema, fd)
  if (!r.ok) volver(ruta, 'error', r.error)
  const { error } = await sb.from('perfiles').update({ rol: r.data.rol }).eq('id', r.data.id)
  if (error) volver(ruta, 'error', errorBD(error.message))
  volver(ruta, 'ok', 'Rol actualizado')
}

// ---------- E2 · Comerciantes y puestos ----------
export async function registrarComerciante(fd: FormData) {
  const ruta = '/panel/comerciantes'
  const { u, sb } = await contexto('comerciantes', ruta)
  const r = E.parsear(E.comercianteSchema, fd)
  if (!r.ok) volver(ruta, 'error', r.error)
  const fila = { ...r.data, user_id: u.rol === 'comerciante' ? u.id : null, estado: 'pendiente' }
  const { error } = await sb.from('comerciantes').insert(fila)
  if (error) volver(ruta, 'error', errorBD(error.message))
  volver(ruta, 'ok', 'Comerciante registrado con estado Pendiente')
}

export async function cambiarEstadoComerciante(fd: FormData) {
  const ruta = '/panel/comerciantes'
  const { u, sb } = await contexto('comerciantes', ruta)
  if (u.rol !== 'admin') volver(ruta, 'error', 'Solo el administrador cambia el estado de formalización')
  const r = E.parsear(E.estadoComercianteSchema, fd)
  if (!r.ok) volver(ruta, 'error', r.error)
  const { error } = await sb.from('comerciantes')
    .update({ estado: r.data.estado, observacion: r.data.estado === 'observado' ? r.data.observacion || 'Sin detalle' : null })
    .eq('id', r.data.id)
  if (error) volver(ruta, 'error', errorBD(error.message))
  volver(ruta, 'ok', 'Estado de formalización actualizado')
}

export async function registrarPuesto(fd: FormData) {
  const ruta = '/panel/puestos'
  const { u, sb } = await contexto('puestos', ruta)
  if (u.rol !== 'admin') volver(ruta, 'error', 'Solo el administrador registra puestos')
  const r = E.parsear(E.puestoSchema, fd)
  if (!r.ok) volver(ruta, 'error', r.error)
  const { error } = await sb.from('puestos').insert(r.data)
  if (error) volver(ruta, 'error', errorBD(error.message))
  volver(ruta, 'ok', 'Puesto registrado como Disponible')
}

export async function asignarPuesto(fd: FormData) {
  const ruta = '/panel/puestos'
  const { u, sb } = await contexto('puestos', ruta)
  if (u.rol !== 'admin') volver(ruta, 'error', 'Solo el administrador asigna puestos')
  const r = E.parsear(E.asignarPuestoSchema, fd)
  if (!r.ok) volver(ruta, 'error', r.error)
  const { data: c } = await sb.from('comerciantes').select('estado').eq('id', r.data.comerciante_id).single()
  if (c?.estado !== 'formalizado') volver(ruta, 'error', 'Solo se asignan puestos a comerciantes formalizados')
  const { error } = await sb.from('puestos')
    .update({ estado: 'ocupado', comerciante_id: r.data.comerciante_id })
    .eq('id', r.data.puesto_id).eq('estado', 'disponible')
  if (error) volver(ruta, 'error', errorBD(error.message))
  volver(ruta, 'ok', 'Puesto asignado')
}

export async function liberarPuesto(fd: FormData) {
  const ruta = '/panel/puestos'
  const { u, sb } = await contexto('puestos', ruta)
  if (u.rol !== 'admin') volver(ruta, 'error', 'Solo el administrador libera puestos')
  const id = Number(fd.get('puesto_id'))
  const { error } = await sb.from('puestos').update({ estado: 'disponible', comerciante_id: null }).eq('id', id)
  if (error) volver(ruta, 'error', errorBD(error.message))
  volver(ruta, 'ok', 'Puesto liberado')
}

// ---------- E3 · Estibaje ----------
export async function registrarEstibador(fd: FormData) {
  const ruta = '/panel/estibaje'
  const { u, sb } = await contexto('estibaje', ruta)
  if (u.rol !== 'admin') volver(ruta, 'error', 'Solo el administrador registra estibadores')
  const r = E.parsear(E.estibadorSchema, fd)
  if (!r.ok) volver(ruta, 'error', r.error)
  const { error } = await sb.from('estibadores').insert(r.data)
  if (error) volver(ruta, 'error', errorBD(error.message))
  volver(ruta, 'ok', 'Estibador registrado y carné generado')
}

export async function cambiarEstadoEstibador(fd: FormData) {
  const ruta = '/panel/estibaje'
  const { u, sb } = await contexto('estibaje', ruta)
  if (u.rol !== 'admin') volver(ruta, 'error', 'Solo el administrador suspende estibadores')
  const estado = fd.get('estado') === 'suspendido' ? 'suspendido' : 'activo'
  const { error } = await sb.from('estibadores').update({ estado }).eq('id', Number(fd.get('id')))
  if (error) volver(ruta, 'error', errorBD(error.message))
  volver(ruta, 'ok', `Estibador ${estado}`)
}

export async function registrarTarifa(fd: FormData) {
  const ruta = '/panel/estibaje'
  const { u, sb } = await contexto('estibaje', ruta)
  if (u.rol !== 'admin') volver(ruta, 'error', 'Solo el administrador publica tarifas')
  const r = E.parsear(E.tarifaSchema, fd)
  if (!r.ok) volver(ruta, 'error', r.error)
  const { error } = await sb.from('tarifas').upsert(r.data, { onConflict: 'tipo_carga' })
  if (error) volver(ruta, 'error', errorBD(error.message))
  volver(ruta, 'ok', 'Tarifa oficial publicada')
}

export async function solicitarOrden(fd: FormData) {
  const ruta = '/panel/estibaje'
  const { u, sb } = await contexto('estibaje', ruta)
  if (u.rol !== 'comerciante') volver(ruta, 'error', 'Solo los comerciantes solicitan órdenes')
  const r = E.parsear(E.ordenSchema, fd)
  if (!r.ok) volver(ruta, 'error', r.error)
  const { data: c } = await sb.from('comerciantes').select('id, puestos(id)').eq('user_id', u.id).maybeSingle()
  const conPuesto = c && (Array.isArray(c.puestos) ? c.puestos.length > 0 : Boolean(c.puestos))
  if (!c || !conPuesto) volver(ruta, 'error', 'Necesitas estar formalizado y tener un puesto asignado')
  // El monto lo calcula la base de datos (trigger) con la tarifa oficial: el cliente no puede alterarlo.
  const { error } = await sb.from('ordenes_estibaje').insert({ comerciante_id: c.id, ...r.data })
  if (error) volver(ruta, 'error', errorBD(error.message))
  volver(ruta, 'ok', 'Orden solicitada a tarifa oficial')
}

export async function avanzarOrden(fd: FormData) {
  const ruta = '/panel/estibaje'
  const { u, sb } = await contexto('estibaje', ruta)
  if (u.rol !== 'estibador') volver(ruta, 'error', 'Solo los estibadores atienden órdenes')
  const { data: est } = await sb.from('estibadores').select('id, estado').eq('user_id', u.id).maybeSingle()
  if (!est || est.estado !== 'activo') volver(ruta, 'error', 'Tu carné de estibador no está activo')
  const { data: o } = await sb.from('ordenes_estibaje').select('id, estado, estibador_id').eq('id', Number(fd.get('id'))).single()
  if (!o) volver(ruta, 'error', 'Orden no encontrada')
  const sig = siguienteEstadoOrden(o.estado)
  if (!sig) volver(ruta, 'error', 'La orden ya está completada')
  if (o.estado === 'aceptada' && o.estibador_id !== est.id) volver(ruta, 'error', 'La orden pertenece a otro estibador')
  const cambios = sig === 'aceptada'
    ? { estado: sig, estibador_id: est.id }
    : { estado: sig, completada_at: new Date().toISOString() }
  const { error } = await sb.from('ordenes_estibaje').update(cambios).eq('id', o.id).eq('estado', o.estado)
  if (error) volver(ruta, 'error', errorBD(error.message))
  volver(ruta, 'ok', sig === 'aceptada' ? 'Orden aceptada' : 'Orden completada y registrada')
}

// ---------- E4 · Citas de descarga ----------
export async function reservarCita(fd: FormData) {
  const ruta = '/panel/citas'
  const { u, sb } = await contexto('citas', ruta)
  if (u.rol !== 'transportista' && u.rol !== 'admin') volver(ruta, 'error', 'Solo transportistas reservan citas')
  const r = E.parsear(E.citaSchema, fd)
  if (!r.ok) volver(ruta, 'error', r.error)
  const { error } = await sb.from('citas').insert({ ...r.data, transportista_id: u.id })
  if (error) volver(ruta, 'error', errorBD(error.message))
  volver(ruta, 'ok', 'Cita reservada')
}

export async function avanzarCita(fd: FormData) {
  const ruta = '/panel/citas'
  const { u, sb } = await contexto('citas', ruta)
  if (u.rol !== 'fiscalizador' && u.rol !== 'admin') volver(ruta, 'error', 'Solo el fiscalizador controla el ingreso')
  const { data: c } = await sb.from('citas').select('id, estado').eq('id', Number(fd.get('id'))).single()
  const sig = c && siguienteEstadoCita(c.estado)
  if (!c || !sig) volver(ruta, 'error', 'La cita ya fue finalizada')
  const ahora = new Date().toISOString()
  const cambios = sig === 'en_mercado' ? { estado: sig, ingreso_at: ahora } : { estado: sig, salida_at: ahora }
  const { error } = await sb.from('citas').update(cambios).eq('id', c.id)
  if (error) volver(ruta, 'error', errorBD(error.message))
  volver(ruta, 'ok', sig === 'en_mercado' ? 'Ingreso registrado' : 'Salida registrada')
}

// ---------- E5 · Salubridad e incidencias ----------
export async function registrarInspeccion(fd: FormData) {
  const ruta = '/panel/salubridad'
  const { u, sb } = await contexto('salubridad', ruta)
  if (u.rol !== 'fiscalizador' && u.rol !== 'admin') volver(ruta, 'error', 'Solo el fiscalizador registra inspecciones')
  const r = E.parsear(E.inspeccionSchema, fd)
  if (!r.ok) volver(ruta, 'error', r.error)
  const { error } = await sb.from('inspecciones').insert({ ...r.data, fiscalizador_id: u.id })
  if (error) volver(ruta, 'error', errorBD(error.message))
  volver(ruta, 'ok', r.data.resultado === 'no_conforme'
    ? 'Inspección registrada: se generó una incidencia de salubridad'
    : 'Inspección registrada')
}

export async function reportarIncidencia(fd: FormData) {
  const ruta = '/panel/salubridad'
  const { u, sb } = await contexto('salubridad', ruta)
  const r = E.parsear(E.incidenciaSchema, fd)
  if (!r.ok) volver(ruta, 'error', r.error)
  const prioridad = calcularPrioridad(r.data.tipo, r.data.gravedad)
  const { error } = await sb.from('incidencias').insert({
    tipo: r.data.tipo, gravedad: r.data.gravedad, descripcion: r.data.descripcion, prioridad,
    puesto_id: r.data.puesto_id === '' || r.data.puesto_id === undefined ? null : r.data.puesto_id,
    reportado_por: u.id,
  })
  if (error) volver(ruta, 'error', errorBD(error.message))
  volver(ruta, 'ok', `Incidencia reportada con prioridad ${prioridad}`)
}

export async function cambiarEstadoIncidencia(fd: FormData) {
  const ruta = '/panel/salubridad'
  const { u, sb } = await contexto('salubridad', ruta)
  if (u.rol !== 'fiscalizador' && u.rol !== 'admin') volver(ruta, 'error', 'Tu rol no puede cambiar el estado')
  const r = E.parsear(E.estadoIncidenciaSchema, fd)
  if (!r.ok) volver(ruta, 'error', r.error)
  const { error } = await sb.from('incidencias').update({ estado: r.data.estado }).eq('id', r.data.id)
  if (error) volver(ruta, 'error', errorBD(error.message))
  volver(ruta, 'ok', 'Estado de la incidencia actualizado')
}
