'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Header() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Verifica se está logado como admin
    const adminToken = localStorage.getItem('admin_logged_in')
    setIsAdmin(adminToken === 'true')
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg z-50">
      <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
        {/* Logo/Título */}
        <div>
          <h1 className="text-xl font-bold">Djeone Martins</h1>
          <p className="text-xs text-blue-100">Devocional Diário</p>
        </div>

        {/* Botão Admin (só aparece se logado) */}
        {isAdmin && (
          <Link
            href="/admin"
            className="text-white/80 hover:text-white transition-colors"
            title="Painel Admin"
          >
            <span className="text-2xl">⚙️</span>
          </Link>
        )}
      </div>
    </header>
  )
}