import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * GET /auth/callback
 *
 * Handles the OAuth / PKCE code exchange after sign-in with Google
 * (or any other OAuth provider). Supabase redirects here with a
 * `code` query parameter; we exchange it for a session and set
 * the auth cookies so server-side auth works on subsequent requests.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  // Validate redirect — only allow relative paths (prevent open redirect)
  const redirectTo = next.startsWith('/') && !next.startsWith('//') ? next : '/';

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
    }

    const response = NextResponse.redirect(`${origin}${redirectTo}`);

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    }
  }

  // If code exchange failed or no code present, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
