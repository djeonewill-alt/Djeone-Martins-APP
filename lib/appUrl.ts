const CANONICAL_APP_URL = 'https://app.djeonemartins.com.br'

export function getPublicAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || CANONICAL_APP_URL).replace(/\/+$/, '')
}
