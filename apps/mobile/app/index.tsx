import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function Index() {
  const { session, loading } = useAuth()
  const [diagnosticDone, setDiagnosticDone] = useState<boolean | null>(null)

  useEffect(() => {
    if (!session) return
    supabase
      .from('profiles')
      .select('diagnostic_done')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setDiagnosticDone(data?.diagnostic_done ?? false))
      .catch(() => setDiagnosticDone(true)) // fail open → home
  }, [session])

  if (loading) return null
  if (!session) return <Redirect href="/(auth)/welcome" />
  if (diagnosticDone === null) return null // awaiting profile check
  return <Redirect href={diagnosticDone ? '/(app)/home' : '/(app)/diagnostic'} />
}
