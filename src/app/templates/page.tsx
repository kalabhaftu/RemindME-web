'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { AppShell } from '@/components/AppShell'
import { Plus, Trash2, CheckSquare, User, RefreshCw, Gift, Copy } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Template = {
  id: string
  name: string
  category: string
  icon_key: string | null
  color_accent: string | null
  notes_template: string | null
  recurrence_frequency: string
  recurrence_ends: string
  default_lead_time: string
  default_channels: string[]
  created_at: string
}

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('task')
  const [newNotes, setNewNotes] = useState('')

  const supabase = useRef(createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ))

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    const { data: { user } } = await supabase.current.auth.getUser()
    if (!user) return
    const { data } = await supabase.current
      .from('reminder_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setTemplates(data)
    setLoading(false)
  }

  const createTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.current.auth.getUser()
    if (!user || !newName.trim()) return

    await supabase.current.from('reminder_templates').insert({
      user_id: user.id,
      name: newName.trim(),
      category: newCategory,
      notes_template: newNotes || null,
      default_channels: ['in_app'],
    })

    setShowCreate(false)
    setNewName('')
    setNewNotes('')
    loadTemplates()
  }

  const deleteTemplate = async (id: string) => {
    await supabase.current.from('reminder_templates').delete().eq('id', id)
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  const applyTemplate = async (template: Template) => {
    // Create a reminder item from template defaults
    const { data: { user } } = await supabase.current.auth.getUser()
    if (!user) return

    const { error } = await supabase.current.from('reminder_items').insert({
      user_id: user.id,
      name: template.name,
      category: template.category,
      notes: template.notes_template,
      color_accent: template.color_accent,
    })

    if (!error) router.push('/')
  }

  const categoryIcon = (cat: string) => {
    switch (cat) {
      case 'person': return <User size={16} />
      case 'subscription': return <RefreshCw size={16} />
      case 'task': return <CheckSquare size={16} />
      case 'custom_holiday': return <Gift size={16} />
      default: return null
    }
  }

  return (
    <AppShell
      title="Templates"
      action={
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-[#3B82F6] hover:bg-[#5B9CFF] text-white px-4 py-2 rounded-[8px] text-sm font-medium transition-colors"
        >
          <Plus size={16} /> New
        </button>
      }
    >
      <div className="max-w-2xl mx-auto space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]" />
          </div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-[12px]">
            <p className="text-[rgba(255,255,255,0.38)] text-sm">No templates yet. Create one to quickly add reminders.</p>
          </div>
        ) : (
          templates.map(t => (
            <div key={t.id} className="p-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[12px] flex items-center gap-3 group">
              <div className="text-[#3B82F6]">{categoryIcon(t.category)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[rgba(255,255,255,0.92)] truncate">{t.name}</div>
                <div className="text-xs text-[rgba(255,255,255,0.45)] mt-0.5">
                  {t.category} &middot; {t.recurrence_frequency}
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => applyTemplate(t)}
                  className="p-2 text-[rgba(255,255,255,0.38)] hover:text-[#34D399] transition-colors"
                  title="Use template"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={() => deleteTemplate(t.id)}
                  className="p-2 text-[rgba(255,255,255,0.38)] hover:text-red-400 transition-colors"
                  title="Delete template"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0c14]/55 backdrop-blur-[18px]">
          <div className="bg-[rgba(255,255,255,0.06)] w-full max-w-sm rounded-[20px] border border-[rgba(255,255,255,0.08)] p-6">
            <h2 className="text-lg font-semibold text-[rgba(255,255,255,0.92)] mb-4">New Template</h2>
            <form onSubmit={createTemplate} className="space-y-4">
              <div>
                <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-sm focus:outline-none focus:border-[#3B82F6]/60"
                  placeholder="e.g., Monthly Bills"
                />
              </div>
              <div>
                <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-sm focus:outline-none focus:border-[#3B82F6]/60"
                >
                  <option value="task">Task</option>
                  <option value="person">Person</option>
                  <option value="subscription">Subscription</option>
                  <option value="custom_holiday">Event</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] uppercase tracking-[0.02em] font-medium text-[rgba(255,255,255,0.6)] mb-2">Default Notes</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-4 py-3 text-sm focus:outline-none focus:border-[#3B82F6]/60 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-[8px] text-sm text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.06)] transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-[#3B82F6] hover:bg-[#5B9CFF] text-white py-3 rounded-[8px] text-sm font-medium transition-colors">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  )
}
