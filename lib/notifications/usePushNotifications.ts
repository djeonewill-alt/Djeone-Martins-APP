import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { trackAppEvent } from '@/lib/analytics/client'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error
  ) {
    return String((error as { message?: unknown }).message)
  }

  return String(error)
}

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkSubscription()
  }, [])

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error('[push] Erro ao verificar notificações:', error)
    }
  }

  const subscribe = async () => {
    const userId = localStorage.getItem('user_id')

    if (!userId) {
      alert('❌ Faça login para ativar notificações.')
      return false
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

    if (!vapidPublicKey) {
      alert('❌ Chave pública de notificações não configurada.')
      return false
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('❌ Este navegador não suporta notificações push.')
      return false
    }

    setLoading(true)

    try {
      console.log('[push] iniciando ativação', {
        userId,
        permission: Notification.permission,
        hasVapidPublicKey: Boolean(vapidPublicKey),
        vapidPublicKeyLength: vapidPublicKey.length,
      })

      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      console.log('[push] service worker pronto')

      const permission = await Notification.requestPermission()

      console.log('[push] permissão recebida:', permission)

      if (permission !== 'granted') {
        alert('❌ Permissão de notificações negada.')
        setLoading(false)
        return false
      }

      const existingSubscription = await registration.pushManager.getSubscription()

      if (existingSubscription) {
        console.log('[push] removendo inscrição antiga')
        await existingSubscription.unsubscribe()
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)

      console.log('[push] criando nova inscrição no navegador')

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })

      const subscriptionData = subscription.toJSON()

      console.log('[push] inscrição criada', {
        endpoint: subscriptionData.endpoint,
        hasP256dh: Boolean(subscriptionData.keys?.p256dh),
        hasAuth: Boolean(subscriptionData.keys?.auth),
      })

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id: userId,
            endpoint: subscriptionData.endpoint,
            p256dh: subscriptionData.keys?.p256dh || '',
            auth: subscriptionData.keys?.auth || '',
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'endpoint',
          }
        )

      if (error) {
        console.error('[push] erro Supabase ao salvar inscrição:', error)
        throw error
      }

      setIsSubscribed(true)
      trackAppEvent('notification_enabled', {
        source: 'push_settings',
        metadata: {
          source: 'push_settings',
        },
      })
      alert('✅ Notificações ativadas!')
      return true
    } catch (error) {
      const message = getErrorMessage(error)

      console.error('[push] erro real ao ativar notificações:', error)

      alert(`❌ Erro ao ativar notificações: ${message}`)
      return false
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    setLoading(true)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()

        await supabase
          .from('push_subscriptions')
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('endpoint', subscription.endpoint)
      }

      setIsSubscribed(false)
      alert('✅ Notificações desativadas!')
    } catch (error) {
      const message = getErrorMessage(error)

      console.error('[push] erro real ao desativar notificações:', error)
      alert(`❌ Erro ao desativar notificações: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  return {
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
  }
}

