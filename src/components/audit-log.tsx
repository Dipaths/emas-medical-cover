'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'

interface Row { id: string; at: string; actor: string; action: string; target: string; detail: string; ip: string }

export function AuditLog({ api }: { api: (url: string, init?: RequestInit) => Promise<Response> }) {
  const [rows, setRows] = useState<Row[]>([])
  const [filter, setFilter] = useState('')
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    setErr('')
    const r = await api('/api/audit?limit=300' + (filter ? '&action=' + encodeURIComponent(filter) : ''))
    if (r.ok) setRows(await r.json()); else setErr('Could not load the audit log.')
  }, [api, filter])
  useEffect(() => { load() }, [load])
  const bad = (a: string) => /failed|denied|rejected|delete/.test(a)
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Audit log (latest {rows.length})</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input className="max-w-xs" placeholder="Filter by action prefix, e.g. auth, staff, triage" value={filter} onChange={e => setFilter(e.target.value)} />
          <Button variant="outline" onClick={load}>Refresh</Button>
        </div>
        {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
        <div className="overflow-auto max-h-[65vh]">
          <Table>
            <TableHeader><TableRow className="bg-gray-50"><TableHead>Time</TableHead><TableHead>Who</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>Detail</TableHead><TableHead>IP</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs font-mono whitespace-nowrap">{new Date(r.at).toLocaleString('en-GB')}</TableCell>
                  <TableCell className="text-xs">{r.actor}</TableCell>
                  <TableCell className={`text-xs font-semibold ${bad(r.action) ? 'text-red-700' : ''}`}>{r.action}</TableCell>
                  <TableCell className="text-xs max-w-[160px] truncate">{r.target}</TableCell>
                  <TableCell className="text-xs max-w-[260px] truncate" title={r.detail}>{r.detail}</TableCell>
                  <TableCell className="text-xs font-mono">{r.ip}</TableCell>
                </TableRow>
              ))}
              {!rows.length && <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-6">No entries.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-gray-500">Entries are written by the server and cannot be edited or deleted through the app. Passwords and patient-identifying data are never recorded.</p>
      </CardContent>
    </Card>
  )
}
