'use client'

import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { PrayerRequest } from '@/lib/supabase'
import MyPrayerRequests from './prayer/MyPrayerRequests'
import PrayerLearning from './prayer/PrayerLearning'
import PrayerTabs from './prayer/PrayerTabs'
import PrayerToday from './prayer/PrayerToday'
import PrayerWall from './prayer/PrayerWall'
import {
  getLocalArray,
  getOrCreateDeviceId,
  setLocalArray,
} from './prayer/utils'
import type {
  PrayerEncouragement,
  PrayerSubTab,
} from './prayer/types'

const MY_PRAYER_IDS_KEY = 'djeone-my-prayer-ids-v1'
const PRAYED_IDS_KEY = 'djeone-prayed-ids-v1'
const ENCOURAGEMENT_IDS_KEY = 'djeone-encouragement-ids-v1'

export default function TabOracao() {
  const [activeSubTab, setActiveSubTab] = useState<PrayerSubTab>('hoje')

  const [prayers, setPrayers] = useState<PrayerRequest[]>([])
  const [myPrayers, setMyPrayers] = useState<PrayerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [myLoading, setMyLoading] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [newPrayer, setNewPrayer] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [sending, setSending] = useState(false)

  const [deviceId, setDeviceId] = useState('')
  const [prayedIds, setPrayedIds] = useState<string[]>([])
  const [prayerCounts, setPrayerCounts] = useState<Record<string, number>>({})
  const [encouragementsByPrayer, setEncouragementsByPrayer] = useState<
    Record<string, PrayerEncouragement[]>
  >({})

  useEffect(() => {
    const currentDeviceId = getOrCreateDeviceId()

    setDeviceId(currentDeviceId)
    setPrayedIds(getLocalArray(PRAYED_IDS_KEY))

    loadPrayers(currentDeviceId)
    loadMyPrayers()
  }, [])

  async function getCurrentProfileId() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      throw new Error("Usuário não autenticado.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile?.id) {
      throw new Error("Perfil do usuário não encontrado.");
    }

    window.localStorage.setItem("user_id", profile.id);

    return profile.id as string;
  }

  const loadPrayerStats = async (
    prayerList: PrayerRequest[],
    currentDeviceId: string
  ) => {
    if (prayerList.length === 0) {
      setPrayerCounts({})
      setEncouragementsByPrayer({})
      return
    }

    try {
      const prayerIds = prayerList.map((prayer) => prayer.id)

      const { data: interactions, error: interactionsError } = await supabase
        .from('prayer_interactions')
        .select('prayer_request_id, device_id')
        .in('prayer_request_id', prayerIds)

      if (interactionsError) throw interactionsError

      const { data: encouragements, error: encouragementsError } = await supabase
        .from('prayer_encouragements')
        .select('*')
        .in('prayer_request_id', prayerIds)
        .order('created_at', { ascending: false })

      if (encouragementsError) throw encouragementsError

      const nextCounts: Record<string, number> = {}
      const nextPrayedIds = new Set(getLocalArray(PRAYED_IDS_KEY))
      const nextEncouragements: Record<string, PrayerEncouragement[]> = {}

      ;(interactions || []).forEach((item) => {
        const prayerRequestId = String(item.prayer_request_id)

        nextCounts[prayerRequestId] = (nextCounts[prayerRequestId] || 0) + 1

        if (item.device_id === currentDeviceId) {
          nextPrayedIds.add(prayerRequestId)
        }
      })

      ;((encouragements || []) as PrayerEncouragement[]).forEach((item) => {
        if (!nextEncouragements[item.prayer_request_id]) {
          nextEncouragements[item.prayer_request_id] = []
        }

        nextEncouragements[item.prayer_request_id].push(item)
      })

      const nextPrayedIdsArray = Array.from(nextPrayedIds)

      setPrayerCounts(nextCounts)
      setPrayedIds(nextPrayedIdsArray)
      setEncouragementsByPrayer(nextEncouragements)
      setLocalArray(PRAYED_IDS_KEY, nextPrayedIdsArray)
    } catch (error) {
      console.error('Erro ao carregar estatísticas de oração:', error)
    }
  }

  const loadPrayers = async (currentDeviceId = deviceId) => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('prayer_requests')
        .select('*')
        .eq('is_private', false)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      const nextPrayers = data || []

      setPrayers(nextPrayers)
      await loadPrayerStats(nextPrayers, currentDeviceId || getOrCreateDeviceId())
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMyPrayers = async () => {
    const myIds = getLocalArray(MY_PRAYER_IDS_KEY)

    if (myIds.length === 0) {
      setMyPrayers([])
      return
    }

    try {
      setMyLoading(true)

      const { data, error } = await supabase
        .from('prayer_requests')
        .select('*')
        .in('id', myIds)
        .order('created_at', { ascending: false })

      if (error) throw error

      setMyPrayers(data || [])
    } catch (error) {
      console.error('Erro ao carregar meus pedidos:', error)
    } finally {
      setMyLoading(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!newPrayer.trim()) return

    setSending(true)

    try {
      const profileId = await getCurrentProfileId()

      const { data, error } = await supabase
        .from('prayer_requests')
        .insert({
          user_id: profileId,
          content: newPrayer.trim(),
          author_name: authorName.trim() || 'Anônimo',
          is_private: isPrivate,
          is_answered: false,
          is_active: true,
        })
        .select('*')
        .single()

      if (error) throw error

      if (data?.id) {
        const currentIds = getLocalArray(MY_PRAYER_IDS_KEY)
        const nextIds = Array.from(new Set([data.id, ...currentIds]))

        setLocalArray(MY_PRAYER_IDS_KEY, nextIds)
      }

      setNewPrayer('')
      setAuthorName('')
      setIsPrivate(false)
      setShowForm(false)

      await loadPrayers(deviceId || getOrCreateDeviceId())
      await loadMyPrayers()

      setActiveSubTab(isPrivate ? 'meus' : 'mural')
    } catch (error) {
      console.error('Erro ao enviar pedido:', error)
      alert('Não foi possível enviar seu pedido agora.')
    } finally {
      setSending(false)
    }
  }

  const handlePray = async (prayer: PrayerRequest) => {
    if (prayedIds.includes(prayer.id)) return

    const currentDeviceId = deviceId || getOrCreateDeviceId()

    try {
      const { error } = await supabase
        .from('prayer_interactions')
        .insert({
          prayer_request_id: prayer.id,
          device_id: currentDeviceId,
        })

      if (error && error.code !== '23505') {
        throw error
      }

      const nextPrayedIds = Array.from(new Set([...prayedIds, prayer.id]))

      setPrayedIds(nextPrayedIds)
      setLocalArray(PRAYED_IDS_KEY, nextPrayedIds)

      setPrayerCounts((current) => ({
        ...current,
        [prayer.id]: (current[prayer.id] || 0) + 1,
      }))
    } catch (error) {
      console.error('Erro ao registrar oração:', error)
      alert('Não foi possível registrar sua oração agora.')
    }
  }

  const handleEncourage = async (
    prayer: PrayerRequest,
    emoji: string,
    message: string
  ) => {
    const currentDeviceId = deviceId || getOrCreateDeviceId()

    try {
      const { data, error } = await supabase
        .from('prayer_encouragements')
        .insert({
          prayer_request_id: prayer.id,
          device_id: currentDeviceId,
          emoji,
          message,
        })
        .select('*')
        .single()

      if (error && error.code !== '23505') {
        throw error
      }

      if (data) {
        const currentEncouragementIds = getLocalArray(ENCOURAGEMENT_IDS_KEY)
        const nextEncouragementIds = Array.from(new Set([data.id, ...currentEncouragementIds]))

        setLocalArray(ENCOURAGEMENT_IDS_KEY, nextEncouragementIds)

        const newEncouragement = data as PrayerEncouragement

        setEncouragementsByPrayer((current) => ({
          ...current,
          [prayer.id]: [
            newEncouragement,
            ...(current[prayer.id] || []),
          ],
        }))
      }
    } catch (error) {
      console.error('Erro ao enviar encorajamento:', error)
      alert('Não foi possível enviar esse encorajamento agora.')
    }
  }

  const handleReport = (prayer: PrayerRequest) => {
    console.log('Pedido sinalizado:', prayer.id)

    alert('Obrigado por avisar. Na próxima etapa, esse alerta irá para moderação.')
  }

  const handleMarkAnswered = async (prayer: PrayerRequest) => {
    const confirmed = confirm('Marcar este pedido como respondido?')

    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('prayer_requests')
        .update({
          is_answered: true,
          answered_at: new Date().toISOString(),
        })
        .eq('id', prayer.id)

      if (error) throw error

      await loadPrayers(deviceId || getOrCreateDeviceId())
      await loadMyPrayers()
    } catch (error) {
      console.error('Erro ao marcar como respondido:', error)
      alert('Não foi possível marcar como respondido.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-32 pt-20 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">
            Oração
          </p>

          <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-0.05em]">
            Ore, interceda e cresça
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Compartilhe pedidos, ore pela comunidade e aprenda a desenvolver uma vida de oração.
          </p>
        </div>

        <PrayerTabs
          activeTab={activeSubTab}
          onChange={setActiveSubTab}
        />

        {activeSubTab === 'hoje' && (
          <PrayerToday
            onOpenWall={() => setActiveSubTab('mural')}
            onOpenLearning={() => setActiveSubTab('aprender')}
          />
        )}

        {activeSubTab === 'mural' && (
          <PrayerWall
            prayers={prayers}
            loading={loading}
            showForm={showForm}
            authorName={authorName}
            newPrayer={newPrayer}
            isPrivate={isPrivate}
            sending={sending}
            prayedIds={prayedIds}
            prayerCounts={prayerCounts}
            encouragementsByPrayer={encouragementsByPrayer}
            onToggleForm={() => setShowForm((value) => !value)}
            onAuthorNameChange={setAuthorName}
            onNewPrayerChange={setNewPrayer}
            onPrivateChange={setIsPrivate}
            onSubmit={handleSubmit}
            onPray={handlePray}
            onReport={handleReport}
            onEncourage={handleEncourage}
          />
        )}

        {activeSubTab === 'meus' && (
          <MyPrayerRequests
            prayers={myPrayers}
            loading={myLoading}
            onOpenWall={() => {
              setShowForm(true)
              setActiveSubTab('mural')
            }}
            onMarkAnswered={handleMarkAnswered}
          />
        )}

        {activeSubTab === 'aprender' && <PrayerLearning />}
      </div>
    </div>
  )
}

