'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import {
  Shield, Activity, ClipboardList, LayoutDashboard, Phone,
  Plus, Trash2, CheckCircle2, AlertTriangle, XCircle, Clock,
  Users, Stethoscope, Truck, TrendingUp, Heart, AlertOctagon,
  Building2, Siren, LogOut, UserCog, ScrollText
} from 'lucide-react'
import { LoginScreen, ChangePasswordScreen, type SessionUser } from '@/components/auth-screens'
import { StaffAdmin } from '@/components/staff-admin'
import { AuditLog } from '@/components/audit-log'

import {
  DISTRICTS, EVENT_TYPES, ENVIRONMENTS, VENUES,
  CROWD_TYPES, TRIAGE_PRIORITIES, FINAL_OUTCOMES, GENDERS,
  MENTAL_STATUSES, ROLES,
} from '@/lib/emas-constants'
import {
  calculateRiskScore, getReferralPathway, getSpecialEquipment,
  calculateRecommendedTier, getAllowedTiers, checkCompliance,
  calculateTotalManpower, calculateUnitDeploymentManpower,
  calculateDurations, calculateStaffingVariance,
} from '@/lib/emas-risk'

// ===== TYPES =====
interface EventRecord {
  id: string; eventName: string; district: string; eventType: string;
  environment: string; venue: string; crowdType: string;
  expectedAttendance: number; dateOfCover: string;
  nearestHospital: string; backupHospital: string;
  calculatedRiskScore: number; specialEquipment: string;
  recommendedTier: string; selectedTier: string; complianceCheck: string;
  doctorsPlanned: number; paramedicsPlanned: number; nursesPlanned: number;
  driversPlanned: number; ssNgoPlanned: number; ssMindefPlanned: number;
  totalManpowerPlanned: number;
  walkingTeamCount: number; walkingTeamManpower: number;
  clinicPublicCount: number; clinicPublicManpower: number;
  clinicVvipCount: number; clinicVvipManpower: number;
  ambulanceTeamCount: number; ambulanceTeamManpower: number;
  victorTeamCount: number; victorTeamManpower: number;
  supportVehicleCount: number; supportVehicleManpower: number;
  manpowerOverall: number; manpowerVariance: number;
  clockInTime: string; eventStartTime: string; standdownTime: string;
  finalClockOutTime: string; missionDuration: string; activeDutyDuration: string;
  doctorsActual: number; paramedicsActual: number; nursesActual: number;
  driversActual: number; ssNgoActual: number; ssMindefActual: number;
  staffingVariance: number;
  totalPatientsAttended: number; hospitalTransportCases: number;
  operationalNotes: string; submissionDate: string;
  _count?: { triageRecords: number };
}

interface TriageRecord {
  id: string; eventId: string; timestamp: string;
  eventDescription: string; venueType: string; caseIndex: string;
  triageTime: string; providerRole: string; assignmentLocation: string;
  patientName: string; age: number; gender: string; affiliation: string; nokContact: string;
  mentalStatus: string; triagePriority: string; presentingComplaint: string; painScale: number;
  temperature: string; bloodPressure: string; pulse: string; glucose: string;
  spo2: string; oxygenSupport: string; ecgTraumaFindings: string;
  actionsTaken: string; treatmentResponse: string; finalOutcome: string;
  dispositionTime: string; hospitalTransport: boolean; transferHospital: string;
  medications: string;
  verifiedCaseIndex: string; doctorNotes: string; treatmentPlan: string; followUpManagement: string;
}

interface DashboardData {
  totalEvents: number; totalTriage: number; compliantEvents: number;
  nonCompliantEvents: number; complianceRate: number;
  p1Count: number; p2Count: number; p3Count: number;
  hospitalTransports: number; totalClinics: number; vvipClinics: number;
  vvipClinicShare: number; amaCount: number; amaRate: number;
  negativeVarianceEvents: number;
  events: EventRecord[]; recentTriage: TriageRecord[];
}

interface Medication {
  name: string; indication: string; dose: string; givenBy: string; time: string;
}

// ===== COLOR HELPERS =====
const NAVY = '#1F3864'
const TEAL = '#2E74B5'
const GOLD = '#BF8F00'

function priorityColor(p: string) {
  if (p === 'P1') return 'bg-red-600 text-white'
  if (p === 'P2') return 'bg-amber-500 text-white'
  if (p === 'P3') return 'bg-green-600 text-white'
  return 'bg-gray-200 text-gray-700'
}

function priorityBg(p: string) {
  if (p === 'P1') return 'bg-red-50 border-red-300'
  if (p === 'P2') return 'bg-amber-50 border-amber-300'
  if (p === 'P3') return 'bg-green-50 border-green-300'
  return 'bg-gray-50 border-gray-300'
}

function complianceBadge(check: string) {
  if (check === 'Compliant') return <Badge className="bg-green-600 text-white"><CheckCircle2 className="w-3 h-3 mr-1" />Compliant</Badge>
  if (check && check !== 'Select a Level of Service') return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Non-Compliant</Badge>
  return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Pending</Badge>
}

// ===== EXTRACTED COMPONENTS (outside render) =====
function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-gray-600">{label}</Label>
      {children}
    </div>
  )
}

function UnitDeploymentRow({ label, countVal, manpowerVal, onCountChange, onManpowerChange }: {
  label: string; countVal: number; manpowerVal: number;
  onCountChange: (v: number) => void; onManpowerChange: (v: number) => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium text-sm">{label}</TableCell>
      <TableCell><Input type="number" min={0} value={countVal} onChange={e => onCountChange(parseInt(e.target.value) || 0)} className="h-8 w-20 text-center" /></TableCell>
      <TableCell><Input type="number" min={1} value={manpowerVal} onChange={e => onManpowerChange(parseInt(e.target.value) || 1)} className="h-8 w-20 text-center" /></TableCell>
      <TableCell className="text-center font-semibold">{countVal * manpowerVal}</TableCell>
    </TableRow>
  )
}

// ===== API HELPER (cookie session; reacts to 401 / forced password change) =====
async function apiFetch(input: string, init?: RequestInit) {
  const res = await fetch(input, { credentials: 'same-origin', ...init })
  if (res.status === 401) window.dispatchEvent(new Event('emas-unauth'))
  if (res.status === 403) {
    try { const j = await res.clone().json(); if (j?.error === 'password_change_required') window.dispatchEvent(new Event('emas-pwchange')) } catch { /* ignore */ }
  }
  return res
}

// ===== MAIN COMPONENT =====
export default function Home() {
  // === GLOBAL STATE ===
  const [user, setUser] = useState<SessionUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [notice, setNotice] = useState('')
  const roles = user?.roles ?? []
  const isAdmin = roles.includes('Admin')
  const showTriage = isAdmin || roles.includes('Triage')
  const showEventPlanning = isAdmin || roles.includes('EventPlanning')
  const showDashboard = isAdmin || roles.includes('Dashboard')
  const canSeeEvents = showTriage || showEventPlanning
  const [clock, setClock] = useState('')
  const [events, setEvents] = useState<EventRecord[]>([])
  const [triageRecords, setTriageRecords] = useState<TriageRecord[]>([])
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)

  // === TRIAGE FORM STATE ===
  const [triageEventId, setTriageEventId] = useState('')
  const [tf, setTf] = useState({
    eventDescription: '', venueType: '', caseIndex: '', triageTime: '',
    providerRole: '', assignmentLocation: '',
    patientName: '', age: 0, gender: '', affiliation: '', nokContact: '',
    mentalStatus: '', triagePriority: '', presentingComplaint: '', painScale: 0,
    temperature: '', bloodPressure: '', pulse: '', glucose: '',
    spo2: '', oxygenSupport: '', ecgTraumaFindings: '',
    actionsTaken: '', treatmentResponse: '', finalOutcome: '', dispositionTime: '',
    hospitalTransport: false, transferHospital: '',
    verifiedCaseIndex: '', doctorNotes: '', treatmentPlan: '', followUpManagement: '',
  })
  const [medications, setMedications] = useState<Medication[]>([])
  const [triageSubmitting, setTriageSubmitting] = useState(false)

  // === EVENT FORM STATE ===
  const [ef, setEf] = useState({
    eventName: '', district: '', eventType: '', environment: '', venue: '',
    crowdType: '', expectedAttendance: 0, dateOfCover: '',
    selectedTier: '',
    doctorsPlanned: 0, paramedicsPlanned: 0, nursesPlanned: 0,
    driversPlanned: 0, ssNgoPlanned: 0, ssMindefPlanned: 0,
    walkingTeamCount: 0, walkingTeamManpower: 2,
    clinicPublicCount: 0, clinicPublicManpower: 3,
    clinicVvipCount: 0, clinicVvipManpower: 4,
    ambulanceTeamCount: 0, ambulanceTeamManpower: 3,
    victorTeamCount: 0, victorTeamManpower: 3,
    supportVehicleCount: 0, supportVehicleManpower: 2,
    clockInTime: '', eventStartTime: '', standdownTime: '', finalClockOutTime: '',
    doctorsActual: 0, paramedicsActual: 0, nursesActual: 0,
    driversActual: 0, ssNgoActual: 0, ssMindefActual: 0,
    totalPatientsAttended: 0,
    operationalNotes: '',
  })
  const [eventSubmitting, setEventSubmitting] = useState(false)

  // === DERIVED EVENT CALCULATIONS ===
  const riskScore = calculateRiskScore(ef.eventType, ef.environment)
  const referralPathway = getReferralPathway(ef.district)
  const specialEquip = getSpecialEquipment(ef.environment)
  const recommendedTier = calculateRecommendedTier(ef.eventType, ef.environment)
  const allowedTiers = getAllowedTiers(recommendedTier)
  const compliance = checkCompliance(ef.selectedTier, recommendedTier)
  const totalManpowerPlanned = calculateTotalManpower(
    ef.doctorsPlanned, ef.paramedicsPlanned, ef.nursesPlanned,
    ef.driversPlanned, ef.ssNgoPlanned, ef.ssMindefPlanned
  )
  const unitManpower = calculateUnitDeploymentManpower({
    walkingTeamCount: ef.walkingTeamCount, walkingTeamManpower: ef.walkingTeamManpower,
    clinicPublicCount: ef.clinicPublicCount, clinicPublicManpower: ef.clinicPublicManpower,
    clinicVvipCount: ef.clinicVvipCount, clinicVvipManpower: ef.clinicVvipManpower,
    ambulanceTeamCount: ef.ambulanceTeamCount, ambulanceTeamManpower: ef.ambulanceTeamManpower,
    victorTeamCount: ef.victorTeamCount, victorTeamManpower: ef.victorTeamManpower,
    supportVehicleCount: ef.supportVehicleCount, supportVehicleManpower: ef.supportVehicleManpower,
  })
  const manpowerVariance = totalManpowerPlanned - unitManpower
  const durations = calculateDurations(ef.clockInTime, ef.eventStartTime, ef.standdownTime, ef.finalClockOutTime)
  const totalManpowerActual = calculateTotalManpower(
    ef.doctorsActual, ef.paramedicsActual, ef.nursesActual,
    ef.driversActual, ef.ssNgoActual, ef.ssMindefActual
  )
  const staffingVariance = calculateStaffingVariance(totalManpowerPlanned, totalManpowerActual)

  // === CLOCK ===
  useEffect(() => {
    const update = () => {
      const now = new Date()
      setClock(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [])

  // === AUTH ===
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : null).then(u => { setUser(u); setAuthChecked(true) }).catch(() => setAuthChecked(true))
    const out = () => { setUser(null); setEvents([]); setTriageRecords([]); setDashboard(null) }
    const pw = () => setUser(u => u ? { ...u, mustChangePassword: true } : u)
    window.addEventListener('emas-unauth', out); window.addEventListener('emas-pwchange', pw)
    return () => { window.removeEventListener('emas-unauth', out); window.removeEventListener('emas-pwchange', pw) }
  }, [])
  const signOut = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }) } catch { /* ignore */ }
    setUser(null); setEvents([]); setTriageRecords([]); setDashboard(null)
  }

  // === DATA FETCHING ===
  const loadEvents = useCallback(async () => {
    try {
      const res = await apiFetch('/api/events')
      if (res.ok) setEvents(await res.json())
    } catch { /* ignore */ }
  }, [])

  const loadTriage = useCallback(async (eventId?: string) => {
    try {
      const url = eventId ? `/api/triage?eventId=${eventId}` : '/api/triage'
      const res = await apiFetch(url)
      if (res.ok) setTriageRecords(await res.json())
    } catch { /* ignore */ }
  }, [])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/dashboard')
      if (res.ok) setDashboard(await res.json())
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  // Data load effects
  useEffect(() => {
    if (!user || user.mustChangePassword || !canSeeEvents) return
    let cancelled = false
    apiFetch('/api/events').then(r => r.ok ? r.json() : null).then(data => { if (!cancelled && data) setEvents(data) })
    return () => { cancelled = true }
  }, [user, canSeeEvents])

  useEffect(() => {
    if (!user || user.mustChangePassword || !showTriage) return
    let cancelled = false
    const url = triageEventId ? `/api/triage?eventId=${triageEventId}` : '/api/triage'
    apiFetch(url).then(r => r.ok ? r.json() : null).then(data => { if (!cancelled && data) setTriageRecords(data) })
    return () => { cancelled = true }
  }, [triageEventId, user, showTriage])

  useEffect(() => {
    if (!user || user.mustChangePassword || !showDashboard) return
    let cancelled = false
    apiFetch('/api/dashboard').then(r => r.ok ? r.json() : null).then(data => {
      if (!cancelled && data) { setDashboard(data); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [user, showDashboard])

  // === TRIAGE SUBMIT ===
  const handleTriageSubmit = async () => {
    if (!triageEventId || !tf.patientName) return
    setTriageSubmitting(true)
    try {
      const res = await apiFetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...tf, eventId: triageEventId,
          medications: JSON.stringify(medications),
        }),
      })
      if (res.ok) {
        setTf({
          eventDescription: '', venueType: '', caseIndex: '', triageTime: '',
          providerRole: '', assignmentLocation: '',
          patientName: '', age: 0, gender: '', affiliation: '', nokContact: '',
          mentalStatus: '', triagePriority: '', presentingComplaint: '', painScale: 0,
          temperature: '', bloodPressure: '', pulse: '', glucose: '',
          spo2: '', oxygenSupport: '', ecgTraumaFindings: '',
          actionsTaken: '', treatmentResponse: '', finalOutcome: '', dispositionTime: '',
          hospitalTransport: false, transferHospital: '',
          verifiedCaseIndex: '', doctorNotes: '', treatmentPlan: '', followUpManagement: '',
        })
        setMedications([])
        loadTriage(triageEventId)
        setNotice('')
      } else {
        const j = await res.json().catch(() => ({}))
        setNotice(j.error ?? 'The server rejected this triage record.')
      }
    } catch { setNotice('Could not save — check your connection (see the Offline Fallback SOP).') }
    setTriageSubmitting(false)
  }

  // === EVENT SUBMIT ===
  const handleEventSubmit = async () => {
    if (!ef.eventName) return
    setEventSubmitting(true)
    try {
      const res = await apiFetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ef,
          nearestHospital: referralPathway.primary,
          backupHospital: referralPathway.backup,
          calculatedRiskScore: riskScore,
          specialEquipment: specialEquip,
          recommendedTier,
          complianceCheck: compliance.message,
          totalManpowerPlanned,
          manpowerOverall: unitManpower,
          manpowerVariance,
          missionDuration: durations.missionDuration,
          activeDutyDuration: durations.activeDutyDuration,
          staffingVariance,
          hospitalTransportCases: 0,
        }),
      })
      if (res.ok) {
        setEf({
          eventName: '', district: '', eventType: '', environment: '', venue: '',
          crowdType: '', expectedAttendance: 0, dateOfCover: '',
          selectedTier: '',
          doctorsPlanned: 0, paramedicsPlanned: 0, nursesPlanned: 0,
          driversPlanned: 0, ssNgoPlanned: 0, ssMindefPlanned: 0,
          walkingTeamCount: 0, walkingTeamManpower: 2,
          clinicPublicCount: 0, clinicPublicManpower: 3,
          clinicVvipCount: 0, clinicVvipManpower: 4,
          ambulanceTeamCount: 0, ambulanceTeamManpower: 3,
          victorTeamCount: 0, victorTeamManpower: 3,
          supportVehicleCount: 0, supportVehicleManpower: 2,
          clockInTime: '', eventStartTime: '', standdownTime: '', finalClockOutTime: '',
          doctorsActual: 0, paramedicsActual: 0, nursesActual: 0,
          driversActual: 0, ssNgoActual: 0, ssMindefActual: 0,
          totalPatientsAttended: 0,
          operationalNotes: '',
        })
        loadEvents()
        setNotice('')
      } else {
        const j = await res.json().catch(() => ({}))
        setNotice(j.error ?? 'The server rejected this event record.')
      }
    } catch { setNotice('Could not save — check your connection.') }
    setEventSubmitting(false)
  }

  // === MEDICATION HELPERS ===
  const addMedication = () => setMedications([...medications, { name: '', indication: '', dose: '', givenBy: '', time: '' }])
  const removeMedication = (i: number) => setMedications(medications.filter((_, idx) => idx !== i))
  const updateMedication = (i: number, field: keyof Medication, value: string) => {
    const updated = [...medications]
    updated[i] = { ...updated[i], [field]: value }
    setMedications(updated)
  }

  // === VISIBLE TABS ===
  if (!authChecked) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>
  if (!user) return <LoginScreen onSignedIn={u => { setNotice(''); setUser(u) }} />
  if (user.mustChangePassword) return <ChangePasswordScreen user={user} onDone={() => setUser({ ...user, mustChangePassword: false })} onSignOut={signOut} />
  if (!showTriage && !showEventPlanning && !showDashboard) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-gray-600"><p>Your account ({user.email}) has no role that grants access to this system.</p><button className="underline" onClick={signOut}>Sign out</button></div>
  )

  // Unique hospitals for transfer dropdown
  const hospitalOptions = DISTRICTS.flatMap(d => [d.primaryHospital, d.backupHospital]).filter(h => h && h !== '—').filter((h, i, a) => a.indexOf(h) === i)



  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F8FAFC' }}>
      {/* ===== TOP NAV BAR ===== */}
      <header className="sticky top-0 z-50 shadow-lg" style={{ background: `linear-gradient(135deg, ${NAVY}, ${TEAL})` }}>
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
          {/* Branding */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 backdrop-blur">
              <Siren className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-base sm:text-lg leading-tight tracking-wide">EMAS Medical Cover</h1>
              <p className="hidden sm:block text-white/70 text-xs font-medium">Emergency Medical Ambulance Services · Brunei Darussalam</p>
            </div>
          </div>

          {/* Center: Clock + Hotline */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-2 text-white/90">
              <Clock className="w-4 h-4" />
              <span className="font-mono text-sm font-semibold">{clock}</span>
            </div>
            <Badge className="bg-red-600 text-white hover:bg-red-700 px-3 py-1 text-xs font-bold shadow-md">
              <Phone className="w-3 h-3 mr-1" /> HOTLINE 995
            </Badge>
          </div>

          {/* Signed-in user */}
          <div className="flex items-center gap-3 text-white">
            <Shield className="w-4 h-4 text-white/70" />
            <div className="hidden sm:block text-right leading-tight">
              <div className="text-sm font-semibold">{user.name}</div>
              <div className="text-[11px] text-white/70">{user.roles.join(' · ')}</div>
            </div>
            <Button size="sm" variant="secondary" onClick={signOut} className="h-8"><LogOut className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Sign out</span><span className="sr-only sm:hidden">Sign out</span></Button>
          </div>
        </div>
      </header>

      {notice && (
        <div role="alert" className="max-w-[1600px] mx-auto w-full px-4 pt-4">
          <div className="flex items-start justify-between gap-3 rounded-md border border-red-300 bg-red-50 text-red-800 px-4 py-3 text-sm font-medium">
            <span>{notice}</span><button onClick={() => setNotice('')} className="underline text-xs">Dismiss</button>
          </div>
        </div>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-2 sm:px-4 py-4 sm:py-6">
        <Tabs defaultValue={showTriage ? 'triage' : showEventPlanning ? 'events' : 'dashboard'} className="w-full">
          <TabsList className="mb-4 sm:mb-6 w-full justify-start bg-white shadow-sm rounded-lg p-1 h-12 overflow-x-auto overflow-y-hidden flex-nowrap">
            {showTriage && (
              <TabsTrigger value="triage" className="flex items-center gap-2 px-3 sm:px-6 whitespace-nowrap shrink-0 data-[state=active]:shadow-sm">
                <Stethoscope className="w-4 h-4" /> Triage App
              </TabsTrigger>
            )}
            {showEventPlanning && (
              <TabsTrigger value="events" className="flex items-center gap-2 px-3 sm:px-6 whitespace-nowrap shrink-0 data-[state=active]:shadow-sm">
                <ClipboardList className="w-4 h-4" /> Event Planning
              </TabsTrigger>
            )}
            {showDashboard && (
              <TabsTrigger value="dashboard" className="flex items-center gap-2 px-3 sm:px-6 whitespace-nowrap shrink-0 data-[state=active]:shadow-sm">
                <LayoutDashboard className="w-4 h-4" /> Command Dashboard
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="staff" className="flex items-center gap-2 px-3 sm:px-6 whitespace-nowrap shrink-0 data-[state=active]:shadow-sm">
                <UserCog className="w-4 h-4" /> Staff
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="audit" className="flex items-center gap-2 px-3 sm:px-6 whitespace-nowrap shrink-0 data-[state=active]:shadow-sm">
                <ScrollText className="w-4 h-4" /> Audit
              </TabsTrigger>
            )}
          </TabsList>

          {/* ===== TRIAGE APP ===== */}
          {showTriage && (
            <TabsContent value="triage">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Triage Form */}
                <Card className="shadow-md border-0">
                  <CardHeader className="pb-3" style={{ background: `linear-gradient(135deg, ${NAVY}, ${TEAL})`, borderRadius: '0.5rem 0.5rem 0 0' }}>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Activity className="w-5 h-5" /> Patient Triage Form
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-5">
                    {/* Event Selection */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-600">Select Event *</Label>
                      <Select value={triageEventId} onValueChange={setTriageEventId}>
                        <SelectTrigger><SelectValue placeholder="Choose an event..." /></SelectTrigger>
                        <SelectContent>
                          {events.map(e => <SelectItem key={e.id} value={e.id}>{e.eventName} — {e.district}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    {/* Event & Staff */}
                    <div>
                      <h3 className="text-sm font-bold mb-3" style={{ color: NAVY }}>Event &amp; Staff Details</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <FieldLabel label="Event Description"><Input value={tf.eventDescription} onChange={e => setTf({ ...tf, eventDescription: e.target.value })} /></FieldLabel>
                        <FieldLabel label="Venue Type"><Input value={tf.venueType} onChange={e => setTf({ ...tf, venueType: e.target.value })} /></FieldLabel>
                        <FieldLabel label="Case Index"><Input value={tf.caseIndex} onChange={e => setTf({ ...tf, caseIndex: e.target.value })} /></FieldLabel>
                        <FieldLabel label="Triage Time"><Input type="time" value={tf.triageTime} onChange={e => setTf({ ...tf, triageTime: e.target.value })} /></FieldLabel>
                        <FieldLabel label="Provider Role">
                          <Select value={tf.providerRole} onValueChange={v => setTf({ ...tf, providerRole: v })}>
                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Doctor">Doctor</SelectItem>
                              <SelectItem value="Paramedic">Paramedic</SelectItem>
                              <SelectItem value="Nurse">Nurse</SelectItem>
                              <SelectItem value="Driver">Driver</SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldLabel>
                        <FieldLabel label="Assignment Location"><Input value={tf.assignmentLocation} onChange={e => setTf({ ...tf, assignmentLocation: e.target.value })} /></FieldLabel>
                      </div>
                    </div>

                    <Separator />

                    {/* Patient Demographics */}
                    <div>
                      <h3 className="text-sm font-bold mb-3" style={{ color: NAVY }}>Patient Demographics</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <FieldLabel label="Patient Name *"><Input value={tf.patientName} onChange={e => setTf({ ...tf, patientName: e.target.value })} placeholder="Full name" /></FieldLabel>
                        <FieldLabel label="Age"><Input type="number" min={0} value={tf.age || ''} onChange={e => setTf({ ...tf, age: parseInt(e.target.value) || 0 })} /></FieldLabel>
                        <FieldLabel label="Gender">
                          <Select value={tf.gender} onValueChange={v => setTf({ ...tf, gender: v })}>
                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                          </Select>
                        </FieldLabel>
                        <FieldLabel label="Affiliation"><Input value={tf.affiliation} onChange={e => setTf({ ...tf, affiliation: e.target.value })} placeholder="e.g. RBAF, MinDef" /></FieldLabel>
                        <FieldLabel label="NOK Contact"><Input value={tf.nokContact} onChange={e => setTf({ ...tf, nokContact: e.target.value })} placeholder="Next of kin" /></FieldLabel>
                      </div>
                    </div>

                    <Separator />

                    {/* Clinical Presentation */}
                    <div>
                      <h3 className="text-sm font-bold mb-3" style={{ color: NAVY }}>Clinical Presentation</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <FieldLabel label="Mental Status">
                          <Select value={tf.mentalStatus} onValueChange={v => setTf({ ...tf, mentalStatus: v })}>
                            <SelectTrigger><SelectValue placeholder="AVPU..." /></SelectTrigger>
                            <SelectContent>{MENTAL_STATUSES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                          </Select>
                        </FieldLabel>
                        <FieldLabel label="Presenting Complaint"><Input value={tf.presentingComplaint} onChange={e => setTf({ ...tf, presentingComplaint: e.target.value })} /></FieldLabel>
                      </div>
                      {/* Priority Buttons */}
                      <div className="mt-3">
                        <Label className="text-xs font-medium text-gray-600 mb-2 block">Triage Priority</Label>
                        <div className="flex gap-2">
                          {TRIAGE_PRIORITIES.map(p => (
                            <button
                              key={p.code}
                              type="button"
                              onClick={() => setTf({ ...tf, triagePriority: p.code })}
                              className={`flex-1 py-3 rounded-lg font-bold text-sm border-2 transition-all ${
                                tf.triagePriority === p.code
                                  ? p.code === 'P1' ? 'bg-red-600 text-white border-red-700 shadow-md' : p.code === 'P2' ? 'bg-amber-500 text-white border-amber-600 shadow-md' : 'bg-green-600 text-white border-green-700 shadow-md'
                                  : p.code === 'P1' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : p.code === 'P2' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                              }`}
                            >
                              {p.code} — {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Pain Scale */}
                      <div className="mt-3">
                        <Label className="text-xs font-medium text-gray-600">Pain Scale: <span className="font-bold text-base" style={{ color: tf.painScale >= 7 ? '#DC2626' : tf.painScale >= 4 ? '#D97706' : '#16A34A' }}>{tf.painScale}</span>/10</Label>
                        <Slider value={[tf.painScale]} onValueChange={v => setTf({ ...tf, painScale: v[0] })} min={0} max={10} step={1} className="mt-2" />
                      </div>
                    </div>

                    <Separator />

                    {/* Primary Assessment */}
                    <div>
                      <h3 className="text-sm font-bold mb-3" style={{ color: NAVY }}>Primary Assessment</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <FieldLabel label="Temperature (°C)"><Input value={tf.temperature} onChange={e => setTf({ ...tf, temperature: e.target.value })} placeholder="36.5" /></FieldLabel>
                        <FieldLabel label="Blood Pressure"><Input value={tf.bloodPressure} onChange={e => setTf({ ...tf, bloodPressure: e.target.value })} placeholder="120/80" /></FieldLabel>
                        <FieldLabel label="Pulse (bpm)"><Input value={tf.pulse} onChange={e => setTf({ ...tf, pulse: e.target.value })} placeholder="72" /></FieldLabel>
                        <FieldLabel label="Glucose (mmol/L)"><Input value={tf.glucose} onChange={e => setTf({ ...tf, glucose: e.target.value })} placeholder="5.5" /></FieldLabel>
                        <FieldLabel label="SpO2 (%)"><Input value={tf.spo2} onChange={e => setTf({ ...tf, spo2: e.target.value })} placeholder="98" /></FieldLabel>
                        <FieldLabel label="Oxygen Support">
                          <Select value={tf.oxygenSupport} onValueChange={v => setTf({ ...tf, oxygenSupport: v })}>
                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="None">None</SelectItem>
                              <SelectItem value="Nasal Cannula">Nasal Cannula</SelectItem>
                              <SelectItem value="Non-Rebreather">Non-Rebreather</SelectItem>
                              <SelectItem value="Bag-Valve-Mask">Bag-Valve-Mask</SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldLabel>
                      </div>
                      <FieldLabel label="ECG / Trauma Findings"><Textarea value={tf.ecgTraumaFindings} onChange={e => setTf({ ...tf, ecgTraumaFindings: e.target.value })} rows={2} /></FieldLabel>
                    </div>

                    <Separator />

                    {/* Management & Outcome */}
                    <div>
                      <h3 className="text-sm font-bold mb-3" style={{ color: NAVY }}>Management &amp; Outcome</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <FieldLabel label="Final Outcome">
                          <Select value={tf.finalOutcome} onValueChange={v => setTf({ ...tf, finalOutcome: v })}>
                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>{FINAL_OUTCOMES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </FieldLabel>
                        <FieldLabel label="Treatment Response"><Input value={tf.treatmentResponse} onChange={e => setTf({ ...tf, treatmentResponse: e.target.value })} /></FieldLabel>
                        <FieldLabel label="Disposition Time"><Input type="time" value={tf.dispositionTime} onChange={e => setTf({ ...tf, dispositionTime: e.target.value })} /></FieldLabel>
                      </div>
                      <FieldLabel label="Actions Taken"><Textarea value={tf.actionsTaken} onChange={e => setTf({ ...tf, actionsTaken: e.target.value })} rows={2} /></FieldLabel>
                      <div className="flex items-center gap-3 mt-3">
                        <Checkbox checked={tf.hospitalTransport} onCheckedChange={c => setTf({ ...tf, hospitalTransport: !!c })} id="hospitalTransport" />
                        <Label htmlFor="hospitalTransport" className="text-sm font-medium">Hospital Transport Required</Label>
                      </div>
                      {tf.hospitalTransport && (
                        <div className="mt-2">
                          <FieldLabel label="Transfer Hospital">
                            <Select value={tf.transferHospital} onValueChange={v => setTf({ ...tf, transferHospital: v })}>
                              <SelectTrigger><SelectValue placeholder="Select hospital..." /></SelectTrigger>
                              <SelectContent>
                                {hospitalOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FieldLabel>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Medications */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold" style={{ color: NAVY }}>Medications</h3>
                        <Button type="button" variant="outline" size="sm" onClick={addMedication} className="h-7 text-xs">
                          <Plus className="w-3 h-3 mr-1" /> Add Medication
                        </Button>
                      </div>
                      {medications.length === 0 && <p className="text-xs text-gray-400 italic">No medications added</p>}
                      <ScrollArea className="max-h-64">
                        <div className="space-y-2">
                          {medications.map((med, i) => (
                            <div key={i} className={`p-3 rounded-lg border ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'} space-y-2`}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-500">Medication #{i + 1}</span>
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeMedication(i)} className="h-6 w-6 p-0 text-red-500 hover:text-red-700">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                <Input placeholder="Name" value={med.name} onChange={e => updateMedication(i, 'name', e.target.value)} className="h-7 text-xs" />
                                <Input placeholder="Indication" value={med.indication} onChange={e => updateMedication(i, 'indication', e.target.value)} className="h-7 text-xs" />
                                <Input placeholder="Dose" value={med.dose} onChange={e => updateMedication(i, 'dose', e.target.value)} className="h-7 text-xs" />
                                <Input placeholder="Given By" value={med.givenBy} onChange={e => updateMedication(i, 'givenBy', e.target.value)} className="h-7 text-xs" />
                                <Input type="time" value={med.time} onChange={e => updateMedication(i, 'time', e.target.value)} className="h-7 text-xs" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    <Separator />

                    {/* Doctor's Report */}
                    <div>
                      <h3 className="text-sm font-bold mb-3" style={{ color: NAVY }}>Doctor&apos;s Report</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FieldLabel label="Verified Case Index"><Input value={tf.verifiedCaseIndex} onChange={e => setTf({ ...tf, verifiedCaseIndex: e.target.value })} /></FieldLabel>
                      </div>
                      <FieldLabel label="Doctor Notes"><Textarea value={tf.doctorNotes} onChange={e => setTf({ ...tf, doctorNotes: e.target.value })} rows={2} /></FieldLabel>
                      <FieldLabel label="Treatment Plan"><Textarea value={tf.treatmentPlan} onChange={e => setTf({ ...tf, treatmentPlan: e.target.value })} rows={2} /></FieldLabel>
                      <FieldLabel label="Follow-Up Management"><Textarea value={tf.followUpManagement} onChange={e => setTf({ ...tf, followUpManagement: e.target.value })} rows={2} /></FieldLabel>
                    </div>

                    {/* Submit */}
                    <Button
                      onClick={handleTriageSubmit}
                      disabled={triageSubmitting || !triageEventId || !tf.patientName}
                      className="w-full h-12 sm:h-11 font-bold text-white shadow-lg sticky bottom-3 z-30 sm:static"
                      style={{ background: `linear-gradient(135deg, ${NAVY}, ${TEAL})` }}
                    >
                      {triageSubmitting ? 'Submitting...' : 'Submit Triage Record'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Live Triage Log */}
                <Card className="shadow-md border-0">
                  <CardHeader className="pb-3" style={{ background: `linear-gradient(135deg, ${NAVY}, ${TEAL})`, borderRadius: '0.5rem 0.5rem 0 0' }}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white flex items-center gap-2">
                        <Activity className="w-5 h-5" /> Live Triage Log
                      </CardTitle>
                      <Badge className="bg-white/20 text-white">{triageRecords.length} records</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[700px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="text-xs">Time</TableHead>
                            <TableHead className="text-xs">Priority</TableHead>
                            <TableHead className="text-xs">Patient</TableHead>
                            <TableHead className="text-xs">Age</TableHead>
                            <TableHead className="text-xs">Complaint</TableHead>
                            <TableHead className="text-xs">Outcome</TableHead>
                            <TableHead className="text-xs">Transport</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {triageRecords.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">No triage records found</TableCell></TableRow>
                          ) : triageRecords.map(r => (
                            <TableRow key={r.id} className={priorityBg(r.triagePriority)}>
                              <TableCell className="text-xs font-mono">{r.triageTime || new Date(r.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                              <TableCell><Badge className={`${priorityColor(r.triagePriority)} text-xs font-bold px-2`}>{r.triagePriority || '—'}</Badge></TableCell>
                              <TableCell className="text-xs font-medium">{r.patientName}</TableCell>
                              <TableCell className="text-xs">{r.age || '—'}</TableCell>
                              <TableCell className="text-xs max-w-[120px] truncate">{r.presentingComplaint || '—'}</TableCell>
                              <TableCell className="text-xs">{r.finalOutcome || '—'}</TableCell>
                              <TableCell className="text-xs">{r.hospitalTransport ? <Truck className="w-4 h-4 text-red-600" /> : '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* ===== EVENT PLANNING APP ===== */}
          {showEventPlanning && (
            <TabsContent value="events">
              <Tabs defaultValue="plan" className="w-full">
                <TabsList className="mb-4 bg-white shadow-sm rounded-lg p-1 h-10">
                  <TabsTrigger value="plan" className="px-6 data-[state=active]:shadow-sm">Plan New Event</TabsTrigger>
                  <TabsTrigger value="records" className="px-6 data-[state=active]:shadow-sm">Live Records</TabsTrigger>
                </TabsList>

                {/* PLAN NEW EVENT */}
                <TabsContent value="plan">
                  <div className="space-y-5">
                    {/* Event Profile */}
                    <Card className="shadow-md border-0">
                      <CardHeader className="pb-3" style={{ background: `linear-gradient(135deg, ${NAVY}, ${TEAL})`, borderRadius: '0.5rem 0.5rem 0 0' }}>
                        <CardTitle className="text-white flex items-center gap-2"><ClipboardList className="w-5 h-5" /> 1. Event Profile</CardTitle>
                      </CardHeader>
                      <CardContent className="p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          <FieldLabel label="Event Name *"><Input value={ef.eventName} onChange={e => setEf({ ...ef, eventName: e.target.value })} placeholder="e.g. National Day Celebration" /></FieldLabel>
                          <FieldLabel label="District">
                            <Select value={ef.district} onValueChange={v => setEf({ ...ef, district: v })}>
                              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>{DISTRICTS.map(d => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </FieldLabel>
                          <FieldLabel label="Event Type">
                            <Select value={ef.eventType} onValueChange={v => setEf({ ...ef, eventType: v })}>
                              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>{EVENT_TYPES.map(e => <SelectItem key={e.type} value={e.type}>{e.type}</SelectItem>)}</SelectContent>
                            </Select>
                          </FieldLabel>
                          <FieldLabel label="Environment">
                            <Select value={ef.environment} onValueChange={v => setEf({ ...ef, environment: v })}>
                              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>{ENVIRONMENTS.map(e => <SelectItem key={e.env} value={e.env}>{e.env}</SelectItem>)}</SelectContent>
                            </Select>
                          </FieldLabel>
                          <FieldLabel label="Venue">
                            <Select value={ef.venue} onValueChange={v => setEf({ ...ef, venue: v })}>
                              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>{VENUES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                            </Select>
                          </FieldLabel>
                          <FieldLabel label="Crowd Type">
                            <Select value={ef.crowdType} onValueChange={v => setEf({ ...ef, crowdType: v })}>
                              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>{CROWD_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                          </FieldLabel>
                          <FieldLabel label="Expected Attendance"><Input type="number" min={0} value={ef.expectedAttendance || ''} onChange={e => setEf({ ...ef, expectedAttendance: parseInt(e.target.value) || 0 })} /></FieldLabel>
                          <FieldLabel label="Date of Cover"><Input type="date" value={ef.dateOfCover} onChange={e => setEf({ ...ef, dateOfCover: e.target.value })} /></FieldLabel>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Risk & Referral (Auto) */}
                    <Card className="shadow-md border-0">
                      <CardHeader className="pb-3" style={{ background: `linear-gradient(135deg, ${NAVY}, ${TEAL})`, borderRadius: '0.5rem 0.5rem 0 0' }}>
                        <CardTitle className="text-white flex items-center gap-2"><Shield className="w-5 h-5" /> 2. Risk &amp; Referral (Auto-Calculated)</CardTitle>
                      </CardHeader>
                      <CardContent className="p-5">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-600">Nearest Hospital</Label>
                            <div className="p-2 bg-blue-50 rounded-md text-sm font-medium text-blue-800">{referralPathway.primary}</div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-600">Backup Hospital</Label>
                            <div className="p-2 bg-gray-50 rounded-md text-sm font-medium text-gray-700">{referralPathway.backup}</div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-600">Risk Score</Label>
                            <div className={`p-2 rounded-md text-sm font-bold ${riskScore >= 3.5 ? 'bg-red-100 text-red-800' : riskScore >= 2.5 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>{riskScore || '—'}</div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-600">Special Equipment</Label>
                            <div className="p-2 bg-gray-50 rounded-md text-sm text-gray-700">{specialEquip}</div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-600">Recommended Tier</Label>
                            <div className="p-2 bg-amber-50 rounded-md text-sm font-bold text-amber-800">{recommendedTier || '—'}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                          <FieldLabel label="Selected Tier *">
                            <Select value={ef.selectedTier} onValueChange={v => setEf({ ...ef, selectedTier: v })}>
                              <SelectTrigger><SelectValue placeholder="Select tier..." /></SelectTrigger>
                              <SelectContent>
                                {allowedTiers.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FieldLabel>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-600">Compliance Check</Label>
                            <div className="mt-1">{complianceBadge(compliance.message)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Manpower Plan */}
                    <Card className="shadow-md border-0">
                      <CardHeader className="pb-3" style={{ background: `linear-gradient(135deg, ${NAVY}, ${TEAL})`, borderRadius: '0.5rem 0.5rem 0 0' }}>
                        <CardTitle className="text-white flex items-center gap-2"><Users className="w-5 h-5" /> 3. Manpower Plan</CardTitle>
                      </CardHeader>
                      <CardContent className="p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                          <FieldLabel label="Doctors"><Input type="number" min={0} value={ef.doctorsPlanned || ''} onChange={e => setEf({ ...ef, doctorsPlanned: parseInt(e.target.value) || 0 })} /></FieldLabel>
                          <FieldLabel label="Paramedics"><Input type="number" min={0} value={ef.paramedicsPlanned || ''} onChange={e => setEf({ ...ef, paramedicsPlanned: parseInt(e.target.value) || 0 })} /></FieldLabel>
                          <FieldLabel label="Nurses"><Input type="number" min={0} value={ef.nursesPlanned || ''} onChange={e => setEf({ ...ef, nursesPlanned: parseInt(e.target.value) || 0 })} /></FieldLabel>
                          <FieldLabel label="Drivers"><Input type="number" min={0} value={ef.driversPlanned || ''} onChange={e => setEf({ ...ef, driversPlanned: parseInt(e.target.value) || 0 })} /></FieldLabel>
                          <FieldLabel label="SS/NGO"><Input type="number" min={0} value={ef.ssNgoPlanned || ''} onChange={e => setEf({ ...ef, ssNgoPlanned: parseInt(e.target.value) || 0 })} /></FieldLabel>
                          <FieldLabel label="SS/MinDef"><Input type="number" min={0} value={ef.ssMindefPlanned || ''} onChange={e => setEf({ ...ef, ssMindefPlanned: parseInt(e.target.value) || 0 })} /></FieldLabel>
                        </div>
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm font-semibold text-blue-800">
                          Total Manpower (Planned): {totalManpowerPlanned}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Team & Unit Deployment */}
                    <Card className="shadow-md border-0">
                      <CardHeader className="pb-3" style={{ background: `linear-gradient(135deg, ${NAVY}, ${TEAL})`, borderRadius: '0.5rem 0.5rem 0 0' }}>
                        <CardTitle className="text-white flex items-center gap-2"><Building2 className="w-5 h-5" /> 4. Team &amp; Unit Deployment (v1.2)</CardTitle>
                      </CardHeader>
                      <CardContent className="p-5">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead>Unit Type</TableHead>
                              <TableHead className="text-center">Count</TableHead>
                              <TableHead className="text-center">Manpower/Unit</TableHead>
                              <TableHead className="text-center">Subtotal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <UnitDeploymentRow label="Walking Team" countVal={ef.walkingTeamCount} manpowerVal={ef.walkingTeamManpower} onCountChange={v => setEf({...ef, walkingTeamCount: v})} onManpowerChange={v => setEf({...ef, walkingTeamManpower: v})} />
                            <UnitDeploymentRow label="Clinic (Public)" countVal={ef.clinicPublicCount} manpowerVal={ef.clinicPublicManpower} onCountChange={v => setEf({...ef, clinicPublicCount: v})} onManpowerChange={v => setEf({...ef, clinicPublicManpower: v})} />
                            <UnitDeploymentRow label="Clinic (VVIP)" countVal={ef.clinicVvipCount} manpowerVal={ef.clinicVvipManpower} onCountChange={v => setEf({...ef, clinicVvipCount: v})} onManpowerChange={v => setEf({...ef, clinicVvipManpower: v})} />
                            <UnitDeploymentRow label="Ambulance Team" countVal={ef.ambulanceTeamCount} manpowerVal={ef.ambulanceTeamManpower} onCountChange={v => setEf({...ef, ambulanceTeamCount: v})} onManpowerChange={v => setEf({...ef, ambulanceTeamManpower: v})} />
                            <UnitDeploymentRow label="Victor Team" countVal={ef.victorTeamCount} manpowerVal={ef.victorTeamManpower} onCountChange={v => setEf({...ef, victorTeamCount: v})} onManpowerChange={v => setEf({...ef, victorTeamManpower: v})} />
                            <UnitDeploymentRow label="Support Vehicle" countVal={ef.supportVehicleCount} manpowerVal={ef.supportVehicleManpower} onCountChange={v => setEf({...ef, supportVehicleCount: v})} onManpowerChange={v => setEf({...ef, supportVehicleManpower: v})} />
                            <TableRow className="bg-blue-50 font-bold">
                              <TableCell>Total</TableCell>
                              <TableCell />
                              <TableCell />
                              <TableCell className="text-center text-lg" style={{ color: NAVY }}>{unitManpower}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                        <div className={`mt-3 p-3 rounded-lg text-sm font-semibold ${manpowerVariance === 0 ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
                          Variance (Planned − Unit): {manpowerVariance} {manpowerVariance === 0 ? '— Balanced' : manpowerVariance > 0 ? '— Surplus planned' : '— Unit exceeds planned'}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Medical Coverage Time */}
                    <Card className="shadow-md border-0">
                      <CardHeader className="pb-3" style={{ background: `linear-gradient(135deg, ${NAVY}, ${TEAL})`, borderRadius: '0.5rem 0.5rem 0 0' }}>
                        <CardTitle className="text-white flex items-center gap-2"><Clock className="w-5 h-5" /> 5. Medical Coverage Time</CardTitle>
                      </CardHeader>
                      <CardContent className="p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          <FieldLabel label="Clock In"><Input type="time" value={ef.clockInTime} onChange={e => setEf({ ...ef, clockInTime: e.target.value })} /></FieldLabel>
                          <FieldLabel label="Event Start"><Input type="time" value={ef.eventStartTime} onChange={e => setEf({ ...ef, eventStartTime: e.target.value })} /></FieldLabel>
                          <FieldLabel label="Standdown"><Input type="time" value={ef.standdownTime} onChange={e => setEf({ ...ef, standdownTime: e.target.value })} /></FieldLabel>
                          <FieldLabel label="Final Clock Out"><Input type="time" value={ef.finalClockOutTime} onChange={e => setEf({ ...ef, finalClockOutTime: e.target.value })} /></FieldLabel>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="p-3 bg-blue-50 rounded-lg text-sm">
                            <span className="font-medium text-blue-800">Mission Duration: </span>
                            <span className="font-bold text-blue-900">{durations.missionDuration}</span>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg text-sm">
                            <span className="font-medium text-green-800">Active Duty Duration: </span>
                            <span className="font-bold text-green-900">{durations.activeDutyDuration}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Actual Staffing */}
                    <Card className="shadow-md border-0">
                      <CardHeader className="pb-3" style={{ background: `linear-gradient(135deg, ${NAVY}, ${TEAL})`, borderRadius: '0.5rem 0.5rem 0 0' }}>
                        <CardTitle className="text-white flex items-center gap-2"><Users className="w-5 h-5" /> 6. Actual Staffing</CardTitle>
                      </CardHeader>
                      <CardContent className="p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                          <FieldLabel label="Doctors"><Input type="number" min={0} value={ef.doctorsActual || ''} onChange={e => setEf({ ...ef, doctorsActual: parseInt(e.target.value) || 0 })} /></FieldLabel>
                          <FieldLabel label="Paramedics"><Input type="number" min={0} value={ef.paramedicsActual || ''} onChange={e => setEf({ ...ef, paramedicsActual: parseInt(e.target.value) || 0 })} /></FieldLabel>
                          <FieldLabel label="Nurses"><Input type="number" min={0} value={ef.nursesActual || ''} onChange={e => setEf({ ...ef, nursesActual: parseInt(e.target.value) || 0 })} /></FieldLabel>
                          <FieldLabel label="Drivers"><Input type="number" min={0} value={ef.driversActual || ''} onChange={e => setEf({ ...ef, driversActual: parseInt(e.target.value) || 0 })} /></FieldLabel>
                          <FieldLabel label="SS/NGO"><Input type="number" min={0} value={ef.ssNgoActual || ''} onChange={e => setEf({ ...ef, ssNgoActual: parseInt(e.target.value) || 0 })} /></FieldLabel>
                          <FieldLabel label="SS/MinDef"><Input type="number" min={0} value={ef.ssMindefActual || ''} onChange={e => setEf({ ...ef, ssMindefActual: parseInt(e.target.value) || 0 })} /></FieldLabel>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="p-3 bg-gray-50 rounded-lg text-sm">
                            <span className="font-medium">Total Actual: </span>
                            <span className="font-bold">{totalManpowerActual}</span>
                          </div>
                          <div className={`p-3 rounded-lg text-sm font-semibold ${staffingVariance === 0 ? 'bg-green-50 text-green-800' : staffingVariance > 0 ? 'bg-blue-50 text-blue-800' : 'bg-red-50 text-red-800'}`}>
                            Staffing Variance: {staffingVariance} {staffingVariance === 0 ? '(Match)' : staffingVariance > 0 ? '(Surplus)' : '(Deficit)'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Patient Summary + Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Card className="shadow-md border-0">
                        <CardHeader className="pb-3" style={{ background: `linear-gradient(135deg, ${NAVY}, ${TEAL})`, borderRadius: '0.5rem 0.5rem 0 0' }}>
                          <CardTitle className="text-white flex items-center gap-2"><Heart className="w-5 h-5" /> 7. Patient Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="p-5">
                          <FieldLabel label="Total Patients Attended"><Input type="number" min={0} value={ef.totalPatientsAttended || ''} onChange={e => setEf({ ...ef, totalPatientsAttended: parseInt(e.target.value) || 0 })} /></FieldLabel>
                        </CardContent>
                      </Card>
                      <Card className="shadow-md border-0">
                        <CardHeader className="pb-3" style={{ background: `linear-gradient(135deg, ${NAVY}, ${TEAL})`, borderRadius: '0.5rem 0.5rem 0 0' }}>
                          <CardTitle className="text-white flex items-center gap-2"><ClipboardList className="w-5 h-5" /> 8. Notes</CardTitle>
                        </CardHeader>
                        <CardContent className="p-5">
                          <FieldLabel label="Operational Notes"><Textarea value={ef.operationalNotes} onChange={e => setEf({ ...ef, operationalNotes: e.target.value })} rows={4} /></FieldLabel>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Submit */}
                    <Button
                      onClick={handleEventSubmit}
                      disabled={eventSubmitting || !ef.eventName}
                      className="w-full h-12 font-bold text-white shadow-lg text-base sticky bottom-3 z-30 sm:static"
                      style={{ background: `linear-gradient(135deg, ${NAVY}, ${TEAL})` }}
                    >
                      {eventSubmitting ? 'Submitting...' : 'Submit Event Record'}
                    </Button>
                  </div>
                </TabsContent>

                {/* LIVE RECORDS */}
                <TabsContent value="records">
                  <Card className="shadow-md border-0">
                    <CardHeader className="pb-3" style={{ background: `linear-gradient(135deg, ${NAVY}, ${TEAL})`, borderRadius: '0.5rem 0.5rem 0 0' }}>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white flex items-center gap-2"><ClipboardList className="w-5 h-5" /> Live Event Records</CardTitle>
                        <Badge className="bg-white/20 text-white">{events.length} events</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="max-h-[600px]">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="text-xs">Event</TableHead>
                              <TableHead className="text-xs">District</TableHead>
                              <TableHead className="text-xs">Type</TableHead>
                              <TableHead className="text-xs">Date</TableHead>
                              <TableHead className="text-xs">Risk</TableHead>
                              <TableHead className="text-xs">Tier</TableHead>
                              <TableHead className="text-xs">Compliance</TableHead>
                              <TableHead className="text-xs">Patients</TableHead>
                              <TableHead className="text-xs">Manpower</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {events.length === 0 ? (
                              <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-8">No events found</TableCell></TableRow>
                            ) : events.map(e => (
                              <TableRow key={e.id}>
                                <TableCell className="text-xs font-medium">{e.eventName}</TableCell>
                                <TableCell className="text-xs">{e.district}</TableCell>
                                <TableCell className="text-xs">{e.eventType}</TableCell>
                                <TableCell className="text-xs">{e.dateOfCover}</TableCell>
                                <TableCell className="text-xs font-semibold">{e.calculatedRiskScore || '—'}</TableCell>
                                <TableCell className="text-xs">{e.selectedTier || '—'}</TableCell>
                                <TableCell>{complianceBadge(e.complianceCheck)}</TableCell>
                                <TableCell className="text-xs text-center">{e._count?.triageRecords ?? e.totalPatientsAttended ?? 0}</TableCell>
                                <TableCell className="text-xs text-center">{e.totalManpowerPlanned}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>
          )}

          {/* ===== COMMAND DASHBOARD ===== */}
          {showDashboard && (
            <TabsContent value="dashboard">
              {loading && !dashboard ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: NAVY }} />
                </div>
              ) : dashboard ? (
                <div className="space-y-6">
                  {/* Stat Cards Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {[
                      { label: 'Total Events', value: dashboard.totalEvents, icon: ClipboardList, color: NAVY },
                      { label: 'Compliant', value: dashboard.compliantEvents, icon: CheckCircle2, color: '#16A34A' },
                      { label: 'Compliance %', value: `${dashboard.complianceRate}%`, icon: Shield, color: dashboard.complianceRate >= 80 ? '#16A34A' : '#DC2626' },
                      { label: 'Patients', value: dashboard.totalTriage, icon: Heart, color: TEAL },
                      { label: 'P1 Cases', value: dashboard.p1Count, icon: AlertOctagon, color: '#DC2626' },
                      { label: 'Transports', value: dashboard.hospitalTransports, icon: Truck, color: '#D97706' },
                      { label: 'AMA Rate', value: `${dashboard.amaRate}%`, icon: TrendingUp, color: '#DC2626' },
                    ].map(s => (
                      <Card key={s.label} className="shadow-md border-0">
                        <CardContent className="p-4 flex flex-col items-center text-center">
                          <s.icon className="w-5 h-5 mb-2" style={{ color: s.color }} />
                          <span className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</span>
                          <span className="text-xs text-gray-500 mt-1">{s.label}</span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Triage Breakdown + Clinic Prevalence */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Card className="shadow-md border-0">
                      <CardHeader className="pb-2" style={{ background: `linear-gradient(135deg, ${NAVY}, ${TEAL})`, borderRadius: '0.5rem 0.5rem 0 0' }}>
                        <CardTitle className="text-white text-sm flex items-center gap-2"><Activity className="w-4 h-4" /> Triage Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {([
                            { code: 'P1', label: 'Emergent', count: dashboard.p1Count, color: '#DC2626', bg: 'bg-red-50' },
                            { code: 'P2', label: 'Urgent', count: dashboard.p2Count, color: '#D97706', bg: 'bg-amber-50' },
                            { code: 'P3', label: 'Non-Urgent', count: dashboard.p3Count, color: '#16A34A', bg: 'bg-green-50' },
                          ] as const).map(p => {
                            const total = dashboard.p1Count + dashboard.p2Count + dashboard.p3Count
                            const pct = total > 0 ? Math.round((p.count / total) * 100) : 0
                            return (
                              <div key={p.code} className={`p-3 rounded-lg ${p.bg}`}>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <Badge className={`${priorityColor(p.code)} text-xs font-bold px-2`}>{p.code}</Badge>
                                    <span className="text-sm font-medium text-gray-700">{p.label}</span>
                                  </div>
                                  <span className="text-lg font-bold" style={{ color: p.color }}>{p.count}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                                </div>
                                <span className="text-xs text-gray-500">{pct}% of total</span>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-md border-0">
                      <CardHeader className="pb-2" style={{ background: `linear-gradient(135deg, ${NAVY}, ${TEAL})`, borderRadius: '0.5rem 0.5rem 0 0' }}>
                        <CardTitle className="text-white text-sm flex items-center gap-2"><Building2 className="w-4 h-4" /> Clinic Prevalence</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-blue-50 rounded-lg text-center">
                            <span className="text-3xl font-bold" style={{ color: NAVY }}>{dashboard.totalClinics}</span>
                            <p className="text-xs text-gray-500 mt-1">Total Clinics</p>
                          </div>
                          <div className="p-4 bg-amber-50 rounded-lg text-center">
                            <span className="text-3xl font-bold" style={{ color: GOLD }}>{dashboard.vvipClinicShare}%</span>
                            <p className="text-xs text-gray-500 mt-1">VVIP Clinic Share</p>
                          </div>
                        </div>
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                          <span className="font-medium">VVIP Clinics: </span>{dashboard.vvipClinics} &nbsp;|&nbsp;
                          <span className="font-medium">Negative Variance Events: </span>{dashboard.negativeVarianceEvents}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Events Table */}
                  <Card className="shadow-md border-0">
                    <CardHeader className="pb-3" style={{ background: `linear-gradient(135deg, ${NAVY}, ${TEAL})`, borderRadius: '0.5rem 0.5rem 0 0' }}>
                      <CardTitle className="text-white flex items-center gap-2"><ClipboardList className="w-5 h-5" /> All Events</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="max-h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="text-xs">Event</TableHead>
                              <TableHead className="text-xs">District</TableHead>
                              <TableHead className="text-xs">Type</TableHead>
                              <TableHead className="text-xs">Date</TableHead>
                              <TableHead className="text-xs">Risk Score</TableHead>
                              <TableHead className="text-xs">Tier</TableHead>
                              <TableHead className="text-xs">Compliance</TableHead>
                              <TableHead className="text-xs">Patients</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dashboard.events.map(e => (
                              <TableRow key={e.id}>
                                <TableCell className="text-xs font-medium">{e.eventName}</TableCell>
                                <TableCell className="text-xs">{e.district}</TableCell>
                                <TableCell className="text-xs">{e.eventType}</TableCell>
                                <TableCell className="text-xs">{e.dateOfCover}</TableCell>
                                <TableCell className="text-xs font-semibold">{e.calculatedRiskScore || '—'}</TableCell>
                                <TableCell className="text-xs">{e.selectedTier || '—'}</TableCell>
                                <TableCell>{complianceBadge(e.complianceCheck)}</TableCell>
                                <TableCell className="text-xs text-center">{e._count?.triageRecords ?? 0}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Recent Triage (Aggregate Only - Framework Section 9.2) */}
                  <Card className="shadow-md border-0">
                    <CardHeader className="pb-3" style={{ background: `linear-gradient(135deg, ${NAVY}, ${TEAL})`, borderRadius: '0.5rem 0.5rem 0 0' }}>
                      <CardTitle className="text-white flex items-center gap-2"><Activity className="w-5 h-5" /> Recent Triage Records (Aggregate Data Only)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="max-h-[300px]">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="text-xs">Time</TableHead>
                              <TableHead className="text-xs">Priority</TableHead>
                              <TableHead className="text-xs">Age</TableHead>
                              <TableHead className="text-xs">Gender</TableHead>
                              <TableHead className="text-xs">Mental Status</TableHead>
                              <TableHead className="text-xs">Outcome</TableHead>
                              <TableHead className="text-xs">Transport</TableHead>
                              <TableHead className="text-xs">Pain</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dashboard.recentTriage.length === 0 ? (
                              <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-6">No triage records</TableCell></TableRow>
                            ) : dashboard.recentTriage.map(r => (
                              <TableRow key={r.id}>
                                <TableCell className="text-xs font-mono">{new Date(r.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                                <TableCell><Badge className={`${priorityColor(r.triagePriority)} text-xs font-bold px-2`}>{r.triagePriority || '—'}</Badge></TableCell>
                                <TableCell className="text-xs">{r.age || '—'}</TableCell>
                                <TableCell className="text-xs">{r.gender || '—'}</TableCell>
                                <TableCell className="text-xs">{r.mentalStatus || '—'}</TableCell>
                                <TableCell className="text-xs">{r.finalOutcome || '—'}</TableCell>
                                <TableCell className="text-xs">{r.hospitalTransport ? 'Yes' : 'No'}</TableCell>
                                <TableCell className="text-xs">{r.painScale}/10</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">Unable to load dashboard data</div>
              )}
            </TabsContent>
          )}
        {isAdmin && (
            <TabsContent value="staff">
              <StaffAdmin api={apiFetch} selfEmail={user.email} />
            </TabsContent>
          )}
          {isAdmin && (
            <TabsContent value="audit">
              <AuditLog api={apiFetch} />
            </TabsContent>
          )}
          </Tabs>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="mt-auto" style={{ background: NAVY }}>
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <p className="text-white/60 text-xs">&copy; 2025 EMAS &middot; Emergency Medical Ambulance Services &middot; Ministry of Health &middot; Brunei Darussalam</p>
          <p className="text-white/40 text-xs">Operations Framework v1.2</p>
        </div>
      </footer>
    </div>
  )
}
