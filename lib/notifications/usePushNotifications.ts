import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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
      console.error('Erro ao verificar notificações:', error)
    }
  }

  const subscribe = async () => {
    const userId = localStorage.getItem('user_id')
    
    if (!userId) {
      alert('❌ Faça login para ativar notificações!')
      return false
    }

    setLoading(true)

    try {
      // Registrar service worker
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Pedir permissão
      const permission = await Notification.requestPermission()
      
      if (permission !== 'granted') {
        alert('❌ Permissão de notificações negada')
        setLoading(false)
        return false
      }

      // Criar subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      })

      // Salvar no Supabase
      const subscriptionData = subscription.toJSON()
      
      await supabase
        .from('push_subscriptions')
        .insert({
          user_id: userId,
          endpoint: subscriptionData.endpoint,
          p256dh: subscriptionData.keys?.p256dh || '',
          auth: subscriptionData.keys?.auth || ''
        })

      setIsSubscribed(true)
      alert('✅ Notificações ativadas!')
      return true
    } catch (error) {
      console.error('Erro ao ativar notificações:', error)
      alert('❌ Erro ao ativar notificações')
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
        
        // Remover do Supabase
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint)
      }

      setIsSubscribed(false)
      alert('✅ Notificações desativadas!')
    } catch (error) {
      console.error('Erro ao desativar notificações:', error)
      alert('❌ Erro ao desativar notificações')
    } finally {
      setLoading(false)
    }
  }

  return {
    isSubscribed,
    loading,
    subscribe,
    unsubscribe
  }
}