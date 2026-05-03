'use client'

import { useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function ListaEspera() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    email: '',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.whatsapp.trim()) {
      alert('❌ Preencha seu nome e WhatsApp!')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('waitlist')
        .insert([{
          name: formData.name.trim(),
          whatsapp: formData.whatsapp.trim(),
          email: formData.email.trim() || null,
        }])

      if (error) throw error

      setSuccess(true)
      setFormData({ name: '', whatsapp: '', email: '' })
    } catch (error) {
      console.error('Erro ao cadastrar:', error)
      alert('❌ Erro ao cadastrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-5">
        <div className="max-w-md w-full text-center">
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-3xl p-8 shadow-2xl">
            <div className="text-7xl mb-6">🎉</div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Você está na lista!
            </h2>
            <p className="text-slate-300 mb-6 leading-relaxed">
              Você receberá uma mensagem no WhatsApp assim que o app estiver disponível!
            </p>
            <button
              onClick={() => setSuccess(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Cadastrar outra pessoa
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-5">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          {/* Foto do Pastor */}
          <div className="relative w-24 h-24 mx-auto mb-6 rounded-full overflow-hidden ring-4 ring-blue-500/50">
            <Image
              src="/pastor.png"
              alt="Pastor Djeone Martins"
              fill
              className="object-cover"
            />
          </div>

          <h1 className="text-4xl font-bold text-white mb-3">
            Devocional Diário
          </h1>
          <p className="text-xl text-blue-300 mb-2">
            com Pr. Djeone Martins
          </p>
          <div className="inline-block bg-yellow-500 text-slate-900 font-bold px-4 py-2 rounded-full text-sm">
            ⏳ EM BREVE
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-2 text-center">
            Entre na Lista de Espera
          </h2>
          <p className="text-slate-400 text-center mb-6 text-sm">
            Seja avisado quando o app lançar!
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
                placeholder="Seu nome"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                WhatsApp *
              </label>
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
                placeholder="(11) 99999-9999"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Email (opcional)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:border-blue-500 outline-none"
                placeholder="seu@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 shadow-lg hover:shadow-blue-500/50"
            >
              {loading ? '⏳ Cadastrando...' : '✅ Entrar na Lista de Espera'}
            </button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-6">
            🔒 Seus dados estão seguros e serão usados apenas para avisar sobre o lançamento
          </p>
        </div>

        <p className="text-center text-slate-400 text-sm mt-6">
          Um app de devocionais em áudio para fortalecer sua fé diariamente
        </p>
      </div>
    </div>
  )
} 
