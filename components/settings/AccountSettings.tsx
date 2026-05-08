'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type ProfileForm = {
  name: string
  email: string
  phone: string
  birth_date: string
  gender: string
  city: string
  neighborhood: string
  country: string
}

type AccountSettingsProps = {
  forceCloseToken?: number
}

const initialForm: ProfileForm = {
  name: '',
  email: '',
  phone: '',
  birth_date: '',
  gender: '',
  city: '',
  neighborhood: '',
  country: 'Brasil',
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function AccountSettings({
  forceCloseToken = 0,
}: AccountSettingsProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState<ProfileForm>(initialForm)

  useEffect(() => {
    loadAccount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (forceCloseToken > 0) {
      setOpen(false)
    }
  }, [forceCloseToken])

  async function loadAccount() {
    try {
      setLoading(true)
      setMessage('')

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError

      if (!user) {
        setAuthUserId(null)
        setFormData(initialForm)
        return
      }

      setAuthUserId(user.id)

      const authEmail = user.email || ''
      const metadataName =
        typeof user.user_metadata?.name === 'string'
          ? user.user_metadata.name
          : typeof user.user_metadata?.display_name === 'string'
            ? user.user_metadata.display_name
            : ''

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(
          'id, name, email, phone, birth_date, gender, city, neighborhood, country, is_premium, premium_expires_at'
        )
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (profileError) throw profileError

      if (profile?.id) {
        setProfileId(profile.id)
        setIsPremium(Boolean(profile.is_premium))
        setPremiumExpiresAt(profile.premium_expires_at || null)

        setFormData({
          name: profile.name || metadataName || '',
          email: profile.email || authEmail,
          phone: profile.phone || '',
          birth_date: profile.birth_date || '',
          gender: profile.gender || '',
          city: profile.city || '',
          neighborhood: profile.neighborhood || '',
          country: profile.country || 'Brasil',
        })
      } else {
        setProfileId(null)
        setIsPremium(false)
        setPremiumExpiresAt(null)

        setFormData({
          ...initialForm,
          name: metadataName || '',
          email: authEmail,
        })
      }
    } catch (error) {
      console.error('Erro ao carregar Minha conta:', error)
      setMessage('Não foi possível carregar os dados da conta agora.')
    } finally {
      setLoading(false)
    }
  }

  function updateField(field: keyof ProfileForm, value: string) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSave() {
    if (!authUserId) {
      setMessage('Entre na sua conta para salvar seus dados.')
      return
    }

    const cleanName = formData.name.trim()

    if (!cleanName) {
      setMessage('Informe seu nome.')
      return
    }

    try {
      setSaving(true)
      setMessage('')

      const payload = {
        auth_user_id: authUserId,
        name: cleanName,
        display_name: cleanName,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        birth_date: formData.birth_date || null,
        gender: formData.gender || null,
        city: formData.city.trim() || null,
        neighborhood: formData.neighborhood.trim() || null,
        country: formData.country.trim() || 'Brasil',
        updated_at: new Date().toISOString(),
      }

      if (profileId) {
        const { error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', profileId)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            ...payload,
            is_premium: false,
            xp: 0,
            level: 1,
          })
          .select('id')
          .single()

        if (error) throw error

        if (data?.id) {
          setProfileId(data.id)
          window.localStorage.setItem('user_id', data.id)
        }
      }

      await supabase.auth.updateUser({
        data: {
          name: cleanName,
          display_name: cleanName,
        },
      })

      setMessage('Dados atualizados com sucesso.')
    } catch (error) {
      console.error('Erro ao salvar Minha conta:', error)
      setMessage('Não foi possível salvar seus dados agora.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="rounded-[30px] border border-white/10 bg-slate-900/80 p-5">
        <div className="mb-4 h-5 w-32 animate-pulse rounded-full bg-white/10" />
        <div className="h-10 animate-pulse rounded-2xl bg-white/10" />
      </section>
    )
  }

  if (!authUserId) {
    return (
      <section className="rounded-[30px] border border-blue-300/15 bg-blue-500/10 p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
          Minha conta
        </p>

        <h3 className="mt-2 text-xl font-black text-white">
          Entre para sincronizar seus dados
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-blue-50/70">
          Com uma conta, você poderá salvar favoritos, orações e preferências do app.
        </p>

        <Link
          href="/cadastro"
          className="mt-5 inline-flex rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950"
        >
          Entrar ou criar conta
        </Link>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-900/80 shadow-[0_18px_55px_rgba(0,0,0,0.28)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full p-5 text-left active:scale-[0.995]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
              Minha conta
            </p>

            <h3 className="mt-2 text-xl font-black tracking-[-0.05em] text-white">
              Dados pessoais
            </h3>

            <p className="mt-1 truncate text-sm text-slate-500">
              {formData.name || 'Seu perfil'} · {formData.email}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-blue-100">
              {isPremium ? 'Premium' : 'Gratuito'}
            </span>

            <span className="text-slate-400">
              <ChevronIcon open={open} />
            </span>
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-white/10 px-5 pb-5">
          <div className="space-y-4 pt-5">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Nome
              </span>
              <input
                type="text"
                value={formData.name}
                onChange={(event) => updateField('name', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-blue-400/50"
                placeholder="Seu nome"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                E-mail
              </span>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm font-bold text-slate-400 outline-none"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Telefone
                </span>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-blue-400/50"
                  placeholder="(11) 99999-9999"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Nascimento
                </span>
                <input
                  type="date"
                  value={formData.birth_date}
                  onChange={(event) => updateField('birth_date', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-400/50"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Gênero
              </span>
              <select
                value={formData.gender}
                onChange={(event) => updateField('gender', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-400/50"
              >
                <option value="">Não informado</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Prefiro não informar">Prefiro não informar</option>
              </select>
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Cidade
                </span>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(event) => updateField('city', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-blue-400/50"
                  placeholder="Sua cidade"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Bairro
                </span>
                <input
                  type="text"
                  value={formData.neighborhood}
                  onChange={(event) => updateField('neighborhood', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-blue-400/50"
                  placeholder="Seu bairro"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                País
              </span>
              <input
                type="text"
                value={formData.country}
                onChange={(event) => updateField('country', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-blue-400/50"
                placeholder="Brasil"
              />
            </label>
          </div>

          {premiumExpiresAt && (
            <p className="mt-4 rounded-2xl border border-yellow-300/15 bg-yellow-500/10 px-4 py-3 text-xs font-bold text-yellow-100">
              Premium ativo até {new Date(premiumExpiresAt).toLocaleDateString('pt-BR')}.
            </p>
          )}

          {message && (
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-slate-200">
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      )}
    </section>
  )
}

