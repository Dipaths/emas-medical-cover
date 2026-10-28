'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Siren } from 'lucide-react'

export interface SessionUser { email: string; name: string; roles: string[]; mustChangePassword: boolean }

const NAVY = '#1F3864', TEAL = '#2E74B5'

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: `linear-gradient(135deg, ${NAVY}, ${TEAL})` }}>
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-lg" style={{ background: NAVY }}><Siren className="w-7 h-7 text-white" /></div>
          <CardTitle className="text-xl" style={{ color: NAVY }}>EMAS Medical Cover</CardTitle>
          <p className="text-sm text-gray-500">{title}</p>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}

export function LoginScreen({ onSignedIn }: { onSignedIn: (u: SessionUser) => void }) {
  const [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const j = await res.json().catch(() => ({}))
      if (res.ok) onSignedIn(j); else setError(j.error ?? 'Sign-in failed.')
    } catch { setError('Cannot reach the server.') }
    setBusy(false)
  }
  return (
    <Shell title="Sign in with your EMAS staff account">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1"><Label htmlFor="em">Email</Label><Input id="em" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></div>
        <div className="space-y-1"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
        {error && <p role="alert" className="text-sm text-red-600 font-medium">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full" style={{ background: NAVY }}>{busy ? 'Signing in…' : 'Sign in'}</Button>
        <p className="text-xs text-gray-500 text-center">Access is by role. Contact the Quality &amp; Operations administrator if you need an account.</p>
      </form>
    </Shell>
  )
}

export function ChangePasswordScreen({ user, onDone, onSignOut }: { user: SessionUser; onDone: () => void; onSignOut: () => void }) {
  const [cur, setCur] = useState(''), [next, setNext] = useState(''), [again, setAgain] = useState('')
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (next !== again) { setError('New passwords do not match.'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: cur, newPassword: next }) })
      const j = await res.json().catch(() => ({}))
      if (res.ok) onDone(); else setError(j.error ?? 'Could not change password.')
    } catch { setError('Cannot reach the server.') }
    setBusy(false)
  }
  return (
    <Shell title={`Set a new password for ${user.email}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1"><Label>Current (temporary) password</Label><Input type="password" autoComplete="current-password" value={cur} onChange={e => setCur(e.target.value)} required /></div>
        <div className="space-y-1"><Label>New password</Label><Input type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} required /><p className="text-xs text-gray-500">At least 10 characters, with letters and a number.</p></div>
        <div className="space-y-1"><Label>Repeat new password</Label><Input type="password" autoComplete="new-password" value={again} onChange={e => setAgain(e.target.value)} required /></div>
        {error && <p role="alert" className="text-sm text-red-600 font-medium">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full" style={{ background: NAVY }}>{busy ? 'Saving…' : 'Change password'}</Button>
        <button type="button" onClick={onSignOut} className="w-full text-xs text-gray-500 underline">Sign out</button>
      </form>
    </Shell>
  )
}
