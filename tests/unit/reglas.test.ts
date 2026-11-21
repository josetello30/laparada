import { describe, it, expect } from 'vitest'
import {
  validarDocumento, validarPlaca, normalizarPlaca, calcularMontoOrden, calcularPrioridad,
  cuposDisponibles, puedeAcceder, siguienteEstadoOrden, siguienteEstadoCita, puedeAsignarPuesto,
  calcularIndicadores,
} from '@/lib/reglas'

describe('HU05 · validarDocumento', () => {
  it('acepta un DNI de 8 dígitos', () => expect(validarDocumento('DNI', '45678912')).toBe(true))
  it('rechaza un DNI con 7 dígitos o letras', () => {
    expect(validarDocumento('DNI', '4567891')).toBe(false)
    expect(validarDocumento('DNI', '4567891A')).toBe(false)
  })
  it('acepta RUC con prefijo válido', () => {
    expect(validarDocumento('RUC', '10456789123')).toBe(true)
    expect(validarDocumento('RUC', '20601234567')).toBe(true)
  })
  it('rechaza RUC con prefijo inválido o longitud errónea', () => {
    expect(validarDocumento('RUC', '30601234567')).toBe(false)
    expect(validarDocumento('RUC', '2060123456')).toBe(false)
  })
})

describe('HU14 · validarPlaca', () => {
  it('normaliza y valida placas', () => {
    expect(normalizarPlaca(' abc-123 ')).toBe('ABC-123')
    expect(validarPlaca('b7k-456')).toBe(true)
  })
  it('rechaza formatos inválidos', () => {
    expect(validarPlaca('AB-123')).toBe(false)
    expect(validarPlaca('ABC123')).toBe(false)
  })
})

describe('HU11 · calcularMontoOrden', () => {
  it('multiplica tarifa oficial por cantidad', () => expect(calcularMontoOrden(1.5, 60)).toBe(90))
  it('redondea a céntimos', () => expect(calcularMontoOrden(0.8, 3)).toBe(2.4))
  it('rechaza cantidad cero, negativa o decimal', () => {
    expect(() => calcularMontoOrden(1, 0)).toThrow()
    expect(() => calcularMontoOrden(1, -5)).toThrow()
    expect(() => calcularMontoOrden(1, 2.5)).toThrow()
  })
})

describe('HU19 · calcularPrioridad', () => {
  it('seguridad + alta es crítica', () => expect(calcularPrioridad('seguridad', 'alta')).toBe('critica'))
  it('tránsito + baja es baja', () => expect(calcularPrioridad('transito', 'baja')).toBe('baja'))
  it('salubridad + alta es alta', () => expect(calcularPrioridad('salubridad', 'alta')).toBe('alta'))
})

describe('HU15 · cuposDisponibles', () => {
  it('resta los ocupados del aforo', () => expect(cuposDisponibles(1, 3)).toBe(2))
  it('nunca devuelve negativo', () => expect(cuposDisponibles(5, 3)).toBe(0))
})

describe('HU03 · puedeAcceder', () => {
  it('el admin accede a usuarios', () => expect(puedeAcceder('admin', 'usuarios')).toBe(true))
  it('el estibador no accede a usuarios', () => expect(puedeAcceder('estibador', 'usuarios')).toBe(false))
  it('el transportista solo ve citas', () => {
    expect(puedeAcceder('transportista', 'citas')).toBe(true)
    expect(puedeAcceder('transportista', 'estibaje')).toBe(false)
  })
  it('sin sesión no accede a nada', () => expect(puedeAcceder(null, 'dashboard')).toBe(false))
})

describe('HU12/HU16 · transiciones de estado', () => {
  it('orden: pendiente → aceptada → completada', () => {
    expect(siguienteEstadoOrden('pendiente')).toBe('aceptada')
    expect(siguienteEstadoOrden('aceptada')).toBe('completada')
    expect(siguienteEstadoOrden('completada')).toBeNull()
  })
  it('cita: reservada → en_mercado → finalizada', () => {
    expect(siguienteEstadoCita('reservada')).toBe('en_mercado')
    expect(siguienteEstadoCita('finalizada')).toBeNull()
  })
})

describe('HU08 · puedeAsignarPuesto', () => {
  it('solo formalizados y puesto disponible', () => {
    expect(puedeAsignarPuesto('formalizado', 'disponible')).toBe(true)
    expect(puedeAsignarPuesto('pendiente', 'disponible')).toBe(false)
    expect(puedeAsignarPuesto('formalizado', 'ocupado')).toBe(false)
  })
})

describe('HU20 · calcularIndicadores', () => {
  const k = calcularIndicadores({
    comerciantes: [{ estado: 'formalizado' }, { estado: 'pendiente' }, { estado: 'formalizado' }, { estado: 'observado' }],
    puestos: [{ estado: 'ocupado' }, { estado: 'disponible' }],
    ordenes: [{ estado: 'completada', monto: 40 }, { estado: 'completada', monto: 64.5 }, { estado: 'pendiente', monto: 10 }],
    incidencias: [{ estado: 'abierta', prioridad: 'critica' }, { estado: 'cerrada', prioridad: 'baja' }],
  })
  it('calcula porcentajes', () => {
    expect(k.pctFormalizados).toBe(50)
    expect(k.pctOcupacion).toBe(50)
  })
  it('suma solo órdenes completadas', () => expect(k.montoEstibaje).toBe(104.5))
  it('cuenta incidencias abiertas por prioridad', () => {
    expect(k.incidenciasAbiertas).toBe(1)
    expect(k.porPrioridad.critica).toBe(1)
  })
  it('no divide entre cero', () => {
    const vacio = calcularIndicadores({ comerciantes: [], puestos: [], ordenes: [], incidencias: [] })
    expect(vacio.pctFormalizados).toBe(0)
  })
})
