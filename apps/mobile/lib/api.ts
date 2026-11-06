import { supabase } from './supabase'

const BASE = process.env.EXPO_PUBLIC_API_URL

async function getToken(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const token = await getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
