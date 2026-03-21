'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CompanyProfile } from '@/lib/types'

export default function SettingsPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Local form state
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [website, setWebsite] = useState('')

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('company_profile')
      .select('*')
      .eq('developer_id', user.id)
      .single()

    if (data) {
      setProfile(data)
      setCompanyName(data.company_name)
      setContactName(data.contact_name ?? '')
      setEmail(data.email ?? '')
      setPhone(data.phone ?? '')
      setStreet(data.street ?? '')
      setCity(data.city ?? '')
      setState(data.state ?? '')
      setZip(data.zip ?? '')
      setWebsite(data.website ?? '')
    } else {
      // Create default profile
      const { data: newProfile } = await supabase.from('company_profile').insert({
        developer_id: user.id,
      }).select('*').single()
      if (newProfile) {
        setProfile(newProfile)
        setCompanyName(newProfile.company_name)
        setContactName(newProfile.contact_name ?? '')
        setEmail(newProfile.email ?? '')
        setState(newProfile.state ?? '')
      }
    }
    setLoading(false)
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    await supabase.from('company_profile').update({
      company_name: companyName,
      contact_name: contactName || null,
      email: email || null,
      phone: phone || null,
      street: street || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      website: website || null,
    }).eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) {
    return <div className="text-gray-400 text-center py-12">Loading...</div>
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
      <p className="text-gray-400 text-sm mb-8">Your company information appears on contracts, invoices, and client-facing documents.</p>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Company Profile</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Company Name *</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Your Name</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Street Address</label>
          <input
            type="text"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="123 Main St, Suite 100"
            className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">State / Jurisdiction</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. State of California"
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-[10px] text-gray-600 mt-1">Your company&apos;s home state. Shown on contracts next to your company name.</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">ZIP</label>
            <input
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="ZIP"
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://practicalinformatics.com"
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !companyName}
            className="px-5 py-2 text-sm font-medium bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-gray-700 text-[#09090B] rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && <span className="text-xs text-green-400">Saved</span>}
        </div>
      </div>
    </div>
  )
}
