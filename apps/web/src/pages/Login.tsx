import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setAuthToken, getAuthToken } from '@/services/api';

const GOOGLE_CLIENT_ID = import.meta.env['VITE_GOOGLE_CLIENT_ID'] ?? '';
const REDIRECT_URI =
  typeof window !== 'undefined'
    ? `${window.location.origin}/login`
    : 'http://localhost:5173/login';

function buildGoogleOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export default function Login(): React.ReactElement {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devEmail, setDevEmail] = useState('');

  // If already authenticated, redirect to home
  useEffect(() => {
    if (getAuthToken()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  // Handle OAuth callback code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;

    // Clean URL
    window.history.replaceState({}, document.title, '/login');

    setIsLoading(true);
    setError(null);

    api.auth
      .googleLogin(code, REDIRECT_URI)
      .then((res) => {
        setAuthToken(res.token);
        navigate('/', { replace: true });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Falha no login com Google';
        setError(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [navigate]);

  const handleGoogleLogin = useCallback((): void => {
    window.location.href = buildGoogleOAuthUrl();
  }, []);

  const handleDevLogin = useCallback((): void => {
    if (!devEmail.trim()) return;
    // Create a fake JWT-like token for dev testing
    const payload = btoa(
      JSON.stringify({
        imobiliariaId: 'dev-imobiliaria',
        email: devEmail.trim(),
        name: devEmail.split('@')[0] ?? 'Dev User',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400 * 7,
      }),
    );
    const fakeToken = `dev.${payload}.signature`;
    setAuthToken(fakeToken);
    navigate('/', { replace: true });
  }, [devEmail, navigate]);

  const isDev = import.meta.env.DEV;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1a1a2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '2.5rem 2rem',
          width: '100%',
          maxWidth: '360px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: '#4f46e5',
              marginBottom: '1rem',
            }}
          >
            <span style={{ fontSize: '2rem' }}>🏠</span>
          </div>
          <h1
            style={{
              margin: '0 0 0.375rem',
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#1a1a2e',
            }}
          >
            VirtualTour
          </h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280' }}>
            Crie tours virtuais 3D fotorrealistas
          </p>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>
            Entrando...
          </div>
        ) : (
          <>
            {error && (
              <div
                style={{
                  background: '#fee2e2',
                  color: '#b91c1c',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                  lineHeight: 1.4,
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                background: '#ffffff',
                color: '#374151',
                border: '1.5px solid #d1d5db',
                borderRadius: '10px',
                padding: '0.875rem',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Entrar com Google
            </button>

            {/* Dev login fallback */}
            {isDev && (
              <div
                style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.5rem',
                  borderTop: '1px solid #e5e7eb',
                }}
              >
                <p
                  style={{
                    margin: '0 0 0.75rem',
                    fontSize: '0.75rem',
                    color: '#9ca3af',
                    textAlign: 'center',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Modo Desenvolvimento
                </p>
                <input
                  type="email"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  placeholder="email@dev.com"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleDevLogin();
                  }}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #d1d5db',
                    fontSize: '0.875rem',
                    marginBottom: '0.5rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleDevLogin}
                  disabled={!devEmail.trim()}
                  style={{
                    width: '100%',
                    background: !devEmail.trim() ? '#9ca3af' : '#374151',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.625rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: !devEmail.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  Entrar como dev
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
