import { describe, it, expect } from 'vitest'
import { comercianteSchema, ordenSchema, citaSchema, incidenciaSchema, loginSchema, parsear } from '@/lib/esquemas'

const fd = (o: Record<string, string>) => {
  const f = new FormData()
  Object.entries(o).forEach(([k, v]) => f.append(k, v))
  return f
}

describe('HU01 · loginSchema', () => {
  it('rechaza contraseñas cortas', () => {
    expect(loginSchema.safeParse({ email: 'a@b.pe', password: '123' }).success).toBe(false)
  })
  it('normaliza el correo', () => {
    const r = loginSchema.parse({ email: ' ADMIN@LaParada.pe ', password: 'Parada2026!' })
    expect(r.email).toBe('admin@laparada.pe')
  })
})

describe('HU04 · comercianteSchema', () => {
  const base = { nombre_comercial: 'Frutas Rosa', tipo_doc: 'RUC', num_doc: '10456789123', rubro: 'Frutas', telefono: '987654321' }
  it('acepta un comerciante válido', () => expect(comercianteSchema.safeParse(base).success).toBe(true))
  it('rechaza documento inválido con mensaje claro', () => {
    const r = parsear(comercianteSchema, fd({ ...base, num_doc: '123' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/Documento inválido/)
  })
  it('rechaza teléfono que no empieza con 9', () => {
    expect(comercianteSchema.safeParse({ ...base, telefono: '812345678' }).success).toBe(false)
  })
})

describe('HU11 · ordenSchema', () => {
  it('rechaza cantidad cero', () => expect(ordenSchema.safeParse({ tarifa_id: '1', cantidad: '0' }).success).toBe(false))
  it('convierte strings a números', () => expect(ordenSchema.parse({ tarifa_id: '2', cantidad: '15' })).toEqual({ tarifa_id: 2, cantidad: 15 }))
})

describe('HU14 · citaSchema', () => {
  it('normaliza la placa', () => {
    const r = citaSchema.parse({ zona_id: '1', fecha: '2026-11-22', franja: '04:00-06:00', placa: 'abc-123' })
    expect(r.placa).toBe('ABC-123')
  })
  it('rechaza franjas fuera del horario', () => {
    expect(citaSchema.safeParse({ zona_id: '1', fecha: '2026-11-22', franja: '13:00-15:00', placa: 'ABC-123' }).success).toBe(false)
  })
})

describe('HU18 · incidenciaSchema', () => {
  it('exige descripción de al menos 10 caracteres', () => {
    expect(incidenciaSchema.safeParse({ tipo: 'seguridad', gravedad: 'alta', descripcion: 'corto' }).success).toBe(false)
  })
  it('acepta incidencia sin puesto', () => {
    expect(incidenciaSchema.safeParse({ tipo: 'transito', gravedad: 'media', descripcion: 'Camión en doble fila', puesto_id: '' }).success).toBe(true)
  })
})
