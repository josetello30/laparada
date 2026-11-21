import Image from 'next/image'
import Link from 'next/link'
import { iniciarSesion, registrarse } from './acciones'
import { Tarjeta, Campo, Entrada, Boton, Aviso, type Busqueda } from '@/components/ui-parada'

const demos = [
  ['admin@laparada.pe', 'Administrador municipal'],
  ['comerciante@laparada.pe', 'Comerciante'],
  ['estibador@laparada.pe', 'Estibador'],
  ['fiscalizador@laparada.pe', 'Fiscalizador'],
  ['transportista@laparada.pe', 'Transportista'],
]

export default async function Login({ searchParams }: { searchParams: Busqueda }) {
  const { ok, error } = await searchParams
  return (
    <main className="mx-auto grid min-h-screen max-w-5xl content-center gap-6 px-6 py-10 md:grid-cols-2">
      <div className="md:col-span-2">
        <Link href="/" className="inline-flex items-center gap-3 text-sm text-emerald-700 hover:underline">
          <Image src="/logo-la-parada.png" alt="Logo de La Parada Digital" width={64} height={64} className="size-16 rounded-xl" priority />
          ← Volver al inicio
        </Link>
        <Aviso ok={ok} error={error} />
      </div>
      <Tarjeta titulo="Iniciar sesión" descripcion="Accede con tu cuenta del mercado">
        <form action={iniciarSesion} className="flex flex-col gap-3">
          <Campo label="Correo"><Entrada name="email" type="email" required autoComplete="email" /></Campo>
          <Campo label="Contraseña"><Entrada name="password" type="password" required minLength={8} autoComplete="current-password" /></Campo>
          <Boton type="submit">Ingresar</Boton>
        </form>
        <div className="mt-5 rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
          <p className="font-medium text-stone-800">Cuentas de demostración · contraseña <code>Parada2026!</code></p>
          <ul className="mt-1 space-y-0.5">
            {demos.map(([c, r]) => <li key={c}><code>{c}</code> — {r}</li>)}
          </ul>
        </div>
      </Tarjeta>
      <Tarjeta titulo="Crear cuenta" descripcion="Las cuentas nuevas inician con rol comerciante; el administrador asigna otros roles.">
        <form action={registrarse} className="flex flex-col gap-3">
          <Campo label="Nombre completo"><Entrada name="nombre" required minLength={3} /></Campo>
          <Campo label="Correo"><Entrada name="email" type="email" required /></Campo>
          <Campo label="Contraseña (mínimo 8 caracteres)"><Entrada name="password" type="password" required minLength={8} autoComplete="new-password" /></Campo>
          <Boton type="submit" variante="secundario">Registrarme</Boton>
        </form>
      </Tarjeta>
    </main>
  )
}
