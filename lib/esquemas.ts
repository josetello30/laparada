// Validación de entradas con Zod (defensa en el servidor antes de llegar a la base de datos).
import { z } from 'zod'
import { FRANJAS, ROLES, validarDocumento, validarPlaca, normalizarPlaca } from './reglas'

const texto = (min: number, max = 120) => z.string().trim().min(min).max(max)

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
})

export const registroSchema = loginSchema.extend({
  nombre: texto(3, 80),
})

export const comercianteSchema = z
  .object({
    nombre_comercial: texto(3, 100),
    tipo_doc: z.enum(['DNI', 'RUC']),
    num_doc: z.string().trim(),
    rubro: z.enum(['Frutas', 'Verduras', 'Tubérculos', 'Abarrotes']),
    telefono: z.string().trim().regex(/^9\d{8}$/, 'Celular de 9 dígitos que empiece con 9'),
  })
  .refine((d) => validarDocumento(d.tipo_doc, d.num_doc), {
    message: 'Documento inválido: DNI de 8 dígitos o RUC de 11 dígitos (10/15/17/20)',
    path: ['num_doc'],
  })

export const estadoComercianteSchema = z.object({
  id: z.coerce.number().int().positive(),
  estado: z.enum(['pendiente', 'en_proceso', 'formalizado', 'observado']),
  observacion: z.string().trim().max(300).optional().default(''),
})

export const puestoSchema = z.object({
  codigo: z.string().trim().toUpperCase().regex(/^[A-Z]-\d{3}$/, 'Formato de código: A-101'),
  pabellon: texto(3, 40),
  rubro: z.enum(['Frutas', 'Verduras', 'Tubérculos', 'Abarrotes']),
})

export const asignarPuestoSchema = z.object({
  puesto_id: z.coerce.number().int().positive(),
  comerciante_id: z.coerce.number().int().positive(),
})

export const estibadorSchema = z.object({
  nombre: texto(3, 80),
  dni: z.string().trim().regex(/^\d{8}$/, 'DNI de 8 dígitos'),
})

export const tarifaSchema = z.object({
  tipo_carga: texto(3, 60),
  unidad: z.enum(['saco', 'jaba', 'caja']),
  monto: z.coerce.number().positive().max(100),
})

export const ordenSchema = z.object({
  tarifa_id: z.coerce.number().int().positive(),
  cantidad: z.coerce.number().int('Cantidad entera').positive('La cantidad debe ser mayor que cero').max(1000),
})

export const citaSchema = z.object({
  zona_id: z.coerce.number().int().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  franja: z.enum(FRANJAS),
  placa: z
    .string()
    .transform(normalizarPlaca)
    .refine(validarPlaca, 'Placa inválida (formato ABC-123)'),
})

export const inspeccionSchema = z.object({
  puesto_id: z.coerce.number().int().positive(),
  resultado: z.enum(['conforme', 'no_conforme']),
  observaciones: z.string().trim().max(300).default(''),
})

export const incidenciaSchema = z.object({
  tipo: z.enum(['salubridad', 'seguridad', 'transito']),
  gravedad: z.enum(['baja', 'media', 'alta']),
  descripcion: z.string().trim().min(10, 'Describe la incidencia con al menos 10 caracteres').max(500),
  puesto_id: z.union([z.literal(''), z.coerce.number().int().positive()]).optional(),
})

export const estadoIncidenciaSchema = z.object({
  id: z.coerce.number().int().positive(),
  estado: z.enum(['abierta', 'en_atencion', 'cerrada']),
})

export const rolSchema = z.object({
  id: z.string().uuid(),
  rol: z.enum(ROLES as [string, ...string[]]),
})

/** Convierte FormData en objeto y devuelve el primer mensaje de error legible. */
export function parsear<T extends z.ZodTypeAny>(schema: T, fd: FormData) {
  const r = schema.safeParse(Object.fromEntries(fd))
  if (r.success) return { ok: true as const, data: r.data as z.infer<T> }
  return { ok: false as const, error: r.error.issues[0]?.message ?? 'Datos inválidos' }
}
