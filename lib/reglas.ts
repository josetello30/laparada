// Reglas de negocio puras (sin dependencias de red) — cubiertas por pruebas unitarias.

export type Rol = 'admin' | 'comerciante' | 'estibador' | 'fiscalizador' | 'transportista'
export type TipoIncidencia = 'salubridad' | 'seguridad' | 'transito'
export type Gravedad = 'baja' | 'media' | 'alta'
export type Prioridad = 'baja' | 'media' | 'alta' | 'critica'
export type Modulo =
  | 'dashboard' | 'comerciantes' | 'puestos' | 'estibaje' | 'citas' | 'salubridad' | 'usuarios'

export const ROLES: Rol[] = ['admin', 'comerciante', 'estibador', 'fiscalizador', 'transportista']
export const FRANJAS = ['04:00-06:00', '06:00-08:00', '08:00-10:00', '10:00-12:00'] as const

/** HU05 · DNI: 8 dígitos. RUC: 11 dígitos con prefijo 10, 15, 17 o 20. */
export function validarDocumento(tipo: 'DNI' | 'RUC', numero: string): boolean {
  const n = numero.trim()
  if (tipo === 'DNI') return /^\d{8}$/.test(n)
  return /^(10|15|17|20)\d{9}$/.test(n)
}

/** HU14 · Placa peruana: 3 alfanuméricos, guion y 3 dígitos (p. ej. ABC-123, B7K-456). */
export function normalizarPlaca(placa: string): string {
  return placa.trim().toUpperCase().replace(/\s+/g, '')
}
export function validarPlaca(placa: string): boolean {
  return /^[A-Z0-9]{3}-\d{3}$/.test(normalizarPlaca(placa))
}

/** HU11 · Monto de la orden = tarifa oficial × cantidad, redondeado a céntimos. */
export function calcularMontoOrden(tarifa: number, cantidad: number): number {
  if (!Number.isInteger(cantidad) || cantidad <= 0) throw new Error('Cantidad inválida')
  if (!(tarifa > 0)) throw new Error('Tarifa inválida')
  return Math.round(tarifa * cantidad * 100) / 100
}

/**
 * HU19 · Matriz de prioridad (tipo × gravedad). La seguridad (cobro de cupos, violencia)
 * pesa más que la salubridad, y esta más que el tránsito.
 */
export const MATRIZ_PRIORIDAD: Record<TipoIncidencia, Record<Gravedad, Prioridad>> = {
  seguridad:  { baja: 'media', media: 'alta',  alta: 'critica' },
  salubridad: { baja: 'baja',  media: 'media', alta: 'alta' },
  transito:   { baja: 'baja',  media: 'media', alta: 'alta' },
}
export function calcularPrioridad(tipo: TipoIncidencia, gravedad: Gravedad): Prioridad {
  return MATRIZ_PRIORIDAD[tipo][gravedad]
}

/** HU15 · Cupos restantes de una franja y zona. */
export function cuposDisponibles(ocupados: number, aforo: number): number {
  return Math.max(0, aforo - ocupados)
}

/** HU03 · Matriz de permisos por rol (se replica en la base de datos con RLS). */
export const PERMISOS: Record<Rol, Modulo[]> = {
  admin: ['dashboard', 'comerciantes', 'puestos', 'estibaje', 'citas', 'salubridad', 'usuarios'],
  fiscalizador: ['dashboard', 'comerciantes', 'puestos', 'citas', 'salubridad'],
  comerciante: ['dashboard', 'comerciantes', 'estibaje', 'salubridad'],
  estibador: ['dashboard', 'estibaje'],
  transportista: ['dashboard', 'citas'],
}
export function puedeAcceder(rol: Rol | null | undefined, modulo: Modulo): boolean {
  if (!rol) return false
  return PERMISOS[rol]?.includes(modulo) ?? false
}

/** HU12 · Transiciones válidas de una orden de estibaje. */
export type EstadoOrden = 'pendiente' | 'aceptada' | 'completada'
export function siguienteEstadoOrden(actual: EstadoOrden): EstadoOrden | null {
  return actual === 'pendiente' ? 'aceptada' : actual === 'aceptada' ? 'completada' : null
}

/** HU16 · Transiciones de una cita de descarga. */
export type EstadoCita = 'reservada' | 'en_mercado' | 'finalizada'
export function siguienteEstadoCita(actual: EstadoCita): EstadoCita | null {
  return actual === 'reservada' ? 'en_mercado' : actual === 'en_mercado' ? 'finalizada' : null
}

/** HU08 · Solo comerciantes formalizados pueden ocupar un puesto disponible. */
export function puedeAsignarPuesto(estadoComerciante: string, estadoPuesto: string): boolean {
  return estadoComerciante === 'formalizado' && estadoPuesto === 'disponible'
}

/** HU20 · Indicadores del dashboard. */
export interface DatosIndicadores {
  comerciantes: { estado: string }[]
  puestos: { estado: string }[]
  ordenes: { estado: string; monto: number }[]
  incidencias: { estado: string; prioridad: Prioridad }[]
}
export function calcularIndicadores(d: DatosIndicadores) {
  const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100))
  const formalizados = d.comerciantes.filter((c) => c.estado === 'formalizado').length
  const ocupados = d.puestos.filter((p) => p.estado === 'ocupado').length
  const completadas = d.ordenes.filter((o) => o.estado === 'completada')
  const abiertas = d.incidencias.filter((i) => i.estado !== 'cerrada')
  const porPrioridad = { critica: 0, alta: 0, media: 0, baja: 0 } as Record<Prioridad, number>
  abiertas.forEach((i) => porPrioridad[i.prioridad]++)
  return {
    totalComerciantes: d.comerciantes.length,
    formalizados,
    pctFormalizados: pct(formalizados, d.comerciantes.length),
    totalPuestos: d.puestos.length,
    puestosOcupados: ocupados,
    pctOcupacion: pct(ocupados, d.puestos.length),
    ordenesCompletadas: completadas.length,
    ordenesPendientes: d.ordenes.filter((o) => o.estado === 'pendiente').length,
    montoEstibaje: Math.round(completadas.reduce((s, o) => s + Number(o.monto), 0) * 100) / 100,
    incidenciasAbiertas: abiertas.length,
    porPrioridad,
  }
}
