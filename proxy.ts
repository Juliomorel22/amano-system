import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Si no hay usuario y trata de entrar a rutas protegidas (dashboard, publicar, perfil, etc)
  // lo mandamos al login.
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/auth')
  const isPublicPage = request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/landing.css'
  
  if (!user && !isAuthPage && !isPublicPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // REGLA DE ORO: Bloqueo de navegación si el perfil está incompleto
  if (user && !request.nextUrl.pathname.startsWith('/perfil') && !isAuthPage && !isPublicPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone, barrio')
      .eq('id', user.id)
      .single()

    // Si faltan datos obligatorios, no lo dejamos salir de /perfil
    if (!profile?.full_name || !profile?.phone || !profile?.barrio) {
      const url = request.nextUrl.clone()
      url.pathname = '/perfil'
      // Agregamos un flag para que en el cliente podamos mostrar un mensaje si queremos
      url.searchParams.set('onboarding', 'true')
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
