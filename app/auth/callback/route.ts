import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
    
    await supabase.auth.exchangeCodeForSession(code)

    // Check if profile is complete
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, phone, barrio')
        .eq('id', user.id)
        .single()

      // Si no hay perfil, o si faltan datos obligatorios, forzar onboarding
      if (error || !profile || !profile.full_name || !profile.phone || !profile.barrio) {
        return NextResponse.redirect(`${requestUrl.origin}/perfil`)
      }

      // Si el perfil está completo, ir al dashboard
      return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
    }
  }

  // Si algo falla o no hay código, ir al perfil por seguridad (allí se valida sesión)
  return NextResponse.redirect(`${requestUrl.origin}/perfil`)
}
