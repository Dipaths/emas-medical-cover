'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'

interface Staff { id: string; email: string; name: string; roles: string; active: boolean; notes: string; mustChangePassword: boolean }
const ROLE_OPTIONS = [
  { v: 'Triage', label: 'Triage (clinical responder)' },
  { v: 'EventPlanning', label: 'Event Planning (operations)' },
  { v: 'Dashboard', label: 'Dashboard (command, read-only)' },
  { v: 'Admin', label: 'Admin (all access + staff management)' },
]
const blank = { email: '', name: '', roles: [] as string[], notes: '', password: '', active: true }

export function StaffAdmin({ api, selfEmail }: { api: (url: string, init?: RequestInit) => Promise<Response>; selfEmail: string }) {
  const [rows, setRows] = useState<Staff[]>([])
  const [form, setForm] = useState({ ...blank })
  const [editing, setEditing] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const r = await api('/api/staff')
    if (r.ok) setRows(await r.json())
  }, [api])
  useEffect(() => { load() }, [load])

  const save = async (data: typeof blank) => {
    setBusy(true); setMsg(null)
    try {
      const r = await api('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const j = await r.json().catch(() => ({}))
      if (r.ok) { setMsg({ ok: true, text: `Saved ${data.email}.` }); setForm({ ...blank }); setEditing(false); await load() }
      else setMsg({ ok: false, text: j.error ?? 'Could not save.' })
    } catch { setMsg({ ok: false, text: 'Cannot reach the server.' }) }
    setBusy(false)
  }
  const edit = (s: Staff) => { setForm({ email: s.email, name: s.name, roles: s.roles.split(',').map(x => x.trim()).filter(Boolean), notes: s.notes, password: '', active: s.active }); setEditing(true); setMsg(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const toggleActive = (s: Staff) => save({ email: s.email, name: s.name, roles: s.roles.split(',').map(x => x.trim()).filter(Boolean), notes: s.notes, password: '', active: !s.active })
  const remove = async (s: Staff) => {
    if (!confirm(`Delete ${s.email}? This cannot be undone. (Suspending is usually safer.)`)) return
    const r = await api('/api/staff?email=' + encodeURIComponent(s.email), { method: 'DELETE' })
    const j = await r.json().catch(() => ({}))
    setMsg(r.ok ? { ok: true, text: `Deleted ${s.email}.` } : { ok: false, text: j.error ?? 'Could not delete.' })
    if (r.ok) load()
  }
  const toggleRole = (v: string) => setForm(f => ({ ...f, roles: f.roles.includes(v) ? f.roles.filter(x => x !== v) : [...f.roles, v] }))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">{editing ? `Edit staff member — ${form.email}` : 'Add staff member'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1"><Label>Email *</Label><Input type="email" value={form.email} disabled={editing} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1"><Label>Full name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1 md:col-span-2">
              <Label>Roles * (a person may hold several)</Label>
              <div className="flex flex-wrap gap-4 pt-1">
                {ROLE_OPTIONS.map(o => (
                  <label key={o.v} className="flex items-center gap-2 text-sm"><Checkbox checked={form.roles.includes(o.v)} onCheckedChange={() => toggleRole(o.v)} />{o.label}</label>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>{editing ? 'Reset password (leave blank to keep)' : 'Temporary password *'}</Label>
              <Input type="text" autoComplete="off" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="min. 10 chars, letters + a number" />
              <p className="text-xs text-gray-500">The user must change it at first sign-in. Share it securely.</p>
            </div>
            <div className="space-y-1"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          {msg && <p role="alert" className={`text-sm font-medium ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
          <div className="flex gap-2">
            <Button disabled={busy || !form.email || !form.name || !form.roles.length || (!editing && !form.password)} onClick={() => save(form)}>{editing ? 'Save changes' : 'Add staff member'}</Button>
            {editing && <Button variant="outline" onClick={() => { setForm({ ...blank }); setEditing(false); setMsg(null) }}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Staff register ({rows.length})</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader><TableRow className="bg-gray-50">
              <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Roles</TableHead><TableHead>Status</TableHead><TableHead>Password</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}{s.email === selfEmail && <span className="ml-2 text-xs text-gray-400">(you)</span>}</TableCell>
                  <TableCell className="text-sm">{s.email}</TableCell>
                  <TableCell className="text-sm">{s.roles}</TableCell>
                  <TableCell><Badge variant={s.active ? 'default' : 'secondary'}>{s.active ? 'Active' : 'Suspended'}</Badge></TableCell>
                  <TableCell className="text-xs text-gray-500">{s.mustChangePassword ? 'Change required / not set' : 'Set by user'}</TableCell>
                  <TableCell className="text-right space-x-2 whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => edit(s)}>Edit</Button>
                    {s.email !== selfEmail && <Button size="sm" variant="outline" onClick={() => toggleActive(s)}>{s.active ? 'Suspend' : 'Reactivate'}</Button>}
                    {s.email !== selfEmail && <Button size="sm" variant="destructive" onClick={() => remove(s)}>Delete</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-6">No staff yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
