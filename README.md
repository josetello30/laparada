# La Parada Digital

Plataforma web para **formalizar el mercado mayorista La Parada** (La Victoria, Lima): padrón de comerciantes y puestos, estibaje trazable sin cobro de cupos, citas de descarga con aforo vehicular, inspecciones de salubridad e incidencias priorizadas, y un dashboard de indicadores para la Municipalidad.

> Proyecto Final de Carrera III · USIL 2026-2 · Práctica Calificada 2 · José Tello

## Stack

| Capa | Tecnología |
|---|---|
| Frontend + backend (Server Components, Server Actions, Proxy) | Next.js 16 · React 19 · TypeScript |
| Estilos | Tailwind CSS 4 · Lucide icons |
| Validación de entradas | Zod |
| Base de datos, autenticación y autorización | Supabase (PostgreSQL 17 · Auth · Row Level Security) |
| Pruebas | Vitest (unitarias + integración contra Supabase) |
| CI/CD y seguridad | GitHub Actions · ESLint · Semgrep (SAST) · pnpm audit (SCA) · Gitleaks · Dependabot |
| Despliegue | Vercel (HTTPS, CDN Edge, previews por rama) · https://laparada-coral.vercel.app |

## Estructura

```
app/                 Rutas (landing, consulta pública, login, panel por módulos) y Server Actions
components/          Componentes de interfaz
lib/reglas.ts        Reglas de negocio puras (probadas con Vitest)
lib/esquemas.ts      Esquemas Zod de validación
lib/supabase/        Cliente de Supabase con sesión en cookies httpOnly
proxy.ts             Protección de rutas /panel y refresco de sesión
supabase/            Migraciones SQL (esquema 3FN, RLS, triggers) y datos de prueba
tests/               Pruebas unitarias e integración (RLS)
.github/workflows/   Pipeline CI/CD DevSecOps y verificación de despliegue
```

## Estrategia de ramas

- `main` → **producción** (Vercel despliega automáticamente).
- `test` → **pruebas / integración**: cada `feature/*` entra por Pull Request a `test`, y `test` pasa a `main` por Pull Request cuando el pipeline está en verde.
- Commits descriptivos con convención `tipo(alcance): descripción` y referencia a la historia de Jira (`LAP-n`).

## Desarrollo local

```bash
pnpm install
cp .env.example .env.local   # completar URL y clave publicable de Supabase
pnpm dev
pnpm test        # unitarias (+ integración si hay variables de Supabase)
pnpm lint && pnpm typecheck && pnpm build
```

## Cuentas de demostración

Contraseña: `Parada2026!` · `admin@laparada.pe`, `comerciante@laparada.pe`, `estibador@laparada.pe`, `fiscalizador@laparada.pe`, `transportista@laparada.pe`.
