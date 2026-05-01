import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto">
      <Header />
      
      <main className="p-5 pb-24">
        {/* Card do devocional de hoje */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl mb-6">
          <div className="text-sm mb-3 opacity-90">
            📅 {new Date().toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </div>
          
          <div className="border-t border-b border-white/20 py-3 mb-3">
            <h2 className="text-2xl font-bold mb-2">
              📖 João 11:17-27
            </h2>
            
            <p className="text-lg italic opacity-95">
              "Eu sou a ressurreição e a vida"
            </p>
          </div>
          
          <button className="w-full bg-gradient-to-r from-yellow-500 to-yellow-400 text-blue-900 font-bold py-4 rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2">
            <span className="text-xl">▶️</span>
            <span>OUVIR AGORA</span>
          </button>
          
          <div className="text-center text-sm mt-3 opacity-80 flex items-center justify-center gap-2">
            <span>⏱️</span>
            <span>10 minutos</span>
          </div>
        </div>

        {/* Reações */}
        <div className="bg-white rounded-xl p-4 shadow mb-6">
          <p className="text-sm font-semibold text-gray-600 mb-3 text-center">
            💬 Como você se sentiu?
          </p>
          <div className="flex gap-2">
            {['🙏', '❤️', '📖', '🔥', '😇'].map((emoji) => (
              <button
                key={emoji}
                className="flex-1 bg-gray-100 hover:bg-blue-100 border-2 border-transparent hover:border-blue-500 rounded-lg py-3 text-center transition-all"
              >
                <div className="text-2xl mb-1">{emoji}</div>
                <div className="text-xs font-semibold text-gray-600">23</div>
              </button>
            ))}
          </div>
        </div>

        {/* Compartilhar */}
        <button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-colors mb-6">
          <span>📤</span>
          <span>Compartilhar no WhatsApp</span>
        </button>

        {/* Anteriores */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
            <div className="w-1 h-4 bg-gradient-to-b from-blue-600 to-yellow-500 rounded" />
            📜 Devocionais Anteriores
          </h3>
          
          <div className="space-y-3">
            {[
              { title: 'João 11:1-16', day: 'Ontem', duration: '12 min' },
              { title: 'João 10:22-42', day: 'Anteontem', duration: '11 min' },
              { title: 'João 10:1-21', day: '3 dias atrás', duration: '13 min' },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white border-2 border-gray-200 hover:border-blue-500 rounded-xl p-4 cursor-pointer transition-all"
              >
                <div className="font-semibold text-gray-900 mb-1">
                  {item.title}
                </div>
                <div className="text-sm text-gray-600 flex items-center gap-3">
                  <span>📅 {item.day}</span>
                  <span>•</span>
                  <span>⏱️ {item.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="text-center text-sm text-gray-600 p-4 bg-green-50 rounded-xl border-2 border-green-200">
          <p className="font-semibold text-green-800">✅ App funcionando!</p>
          <p className="mt-1 text-xs">Próximo: Conectar com banco de dados</p>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
