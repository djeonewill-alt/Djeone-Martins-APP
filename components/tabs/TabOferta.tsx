'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TabOferta() {
  const [pixKey, setPixKey] = useState('')
  const [pixName, setPixName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      console.log('🔍 Buscando configurações...')
      
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .in('key', ['pix_key', 'pix_name'])

      console.log('📊 Dados retornados:', data)
      console.log('❌ Erro:', error)

      if (error) {
        console.error('Erro do Supabase:', error)
        throw error
      }

      if (data && data.length > 0) {
        const settings = data.reduce((acc, item) => {
          acc[item.key] = item.value
          return acc
        }, {} as Record<string, string>)

        console.log('⚙️ Settings processados:', settings)

        setPixKey(settings.pix_key || '')
        setPixName(settings.pix_name || '')
        
        console.log('✅ PIX Key:', settings.pix_key)
        console.log('✅ PIX Name:', settings.pix_name)
      } else {
        console.warn('⚠️ Nenhum dado retornado')
      }
    } catch (error) {
      console.error('💥 Erro ao carregar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyPixKey = () => {
    navigator.clipboard.writeText(pixKey)
    alert('Chave PIX copiada!')
  }

  const suggestedValues = [10, 20, 50, 100]

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Carregando...</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-4 flex items-center gap-2">
        <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-yellow-500 rounded" />
        💚 Contribua com a Obra
      </h2>

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 mb-6 border-2 border-green-200">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">💚</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Sua oferta abençoa vidas
          </h3>
          <p className="text-sm text-gray-600">
            Contribua para que mais pessoas sejam alcançadas pela Palavra
          </p>
        </div>

        <div className="bg-white rounded-lg p-4 mb-4">
          <p className="text-xs text-gray-600 mb-2 text-center">
            Chave PIX (Celular)
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 px-4 py-3 rounded-lg font-mono text-center font-semibold">
              {pixKey || 'Não configurado'}
            </div>
            {pixKey && (
              <button
                onClick={copyPixKey}
                className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                📋
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center font-semibold">
            {pixName || 'Nome não configurado'}
          </p>
        </div>

        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-2 text-center">
            Valores sugeridos:
          </p>
          <div className="grid grid-cols-4 gap-2">
            {suggestedValues.map((value) => (
              <button
                key={value}
                className="bg-white border-2 border-green-200 hover:border-green-500 hover:bg-green-50 rounded-lg py-3 font-bold text-green-700 transition-all"
              >
                R$ {value}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-gray-600 text-center space-y-1">
          <p>✅ 100% destinado à obra</p>
          <p>🔒 Transação segura via PIX</p>
          <p>💝 Sua generosidade transforma vidas</p>
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
        <p className="text-sm text-center text-gray-700">
          <span className="font-semibold">📖 Lembre-se:</span>
          <br />
          "Cada um contribua segundo tiver proposto no coração, não com tristeza ou por necessidade; porque Deus ama a quem dá com alegria."
          <br />
          <span className="text-xs text-gray-600">2 Coríntios 9:7</span>
        </p>
      </div>
    </div>
  )
}