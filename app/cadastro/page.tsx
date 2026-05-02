'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Cadastro() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    birth_date: '',
    gender: '',
    country: 'Brasil',
    city: '',
    neighborhood: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          name: formData.name,
          phone: formData.phone,
          birth_date: formData.birth_date,
          gender: formData.gender,
          country: formData.country,
          city: formData.city,
          neighborhood: formData.neighborhood,
        })

      if (error) throw error

      // Salvar ID do usuário no localStorage
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', formData.phone)
        .single()

      if (data) {
        localStorage.setItem('user_id', data.id)
      }

      alert('✅ Cadastro realizado com sucesso!')
      router.push('/')
    } catch (error) {
      console.error('Erro ao cadastrar:', error)
      alert('❌ Erro ao cadastrar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🙏</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bem-vindo!
          </h1>
          <p className="text-gray-600">
            Cadastre-se para continuar recebendo os devocionais diários
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Ex: Maria Silva"
              className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
              required
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Telefone (com DDD) *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="Ex: 11987654321"
              className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
              required
            />
          </div>

          {/* Data de Nascimento */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Data de Nascimento *
            </label>
            <input
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
              className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
              required
            />
          </div>

          {/* Gênero */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Gênero *
            </label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({...formData, gender: e.target.value})}
              className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
              required
            >
              <option value="">Selecione...</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
          </div>

          {/* País */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              País *
            </label>
            <select
              value={formData.country}
              onChange={(e) => setFormData({...formData, country: e.target.value})}
              className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
              required
            >
              <option value="Brasil">🇧🇷 Brasil</option>
              <option value="Estados Unidos">🇺🇸 Estados Unidos</option>
              <option value="Portugal">🇵🇹 Portugal</option>
              <option value="Canadá">🇨🇦 Canadá</option>
              <option value="Reino Unido">🇬🇧 Reino Unido</option>
              <option value="Austrália">🇦🇺 Austrália</option>
            </select>
          </div>

          {/* Cidade */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Cidade *
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
              placeholder="Ex: Piracaia"
              className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
              required
            />
          </div>

          {/* Bairro */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Bairro *
            </label>
            <input
              type="text"
              value={formData.neighborhood}
              onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
              placeholder="Ex: Centro"
              className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
              required
            />
          </div>

          {/* Botão */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg disabled:opacity-50"
          >
            {saving ? '⏳ Cadastrando...' : '🎉 Completar Cadastro'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Ao cadastrar, você concorda em receber devocionais diários
        </p>
      </div>
    </div>
  )
}