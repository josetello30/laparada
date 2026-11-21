// HU03 · Proxy (antes "middleware"): refresca la sesión de Supabase y protege las rutas del panel.
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return response

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data } = await supabase.auth.getUser()
  const enPanel = request.nextUrl.pathname.startsWith('/panel')
  if (enPanel && !data.user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'Inicia sesión para continuar')
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  matcher: ['/panel/:path*', '/login'],
}
