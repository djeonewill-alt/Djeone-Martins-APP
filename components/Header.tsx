export default function Header() {
  return (
    <header className="bg-gradient-to-r from-blue-900 via-blue-600 to-blue-500 py-8 px-5 text-center relative overflow-hidden">
      {/* Background animado */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-radial from-yellow-400/20 to-transparent animate-pulse" />
      </div>
      
      {/* Conteúdo */}
      <div className="relative z-10">
        {/* Ícones */}
        <div className="flex justify-center items-center gap-3 mb-3">
          <span className="text-xl animate-pulse">✨</span>
          <span className="text-5xl">✝️</span>
          <span className="text-xl animate-pulse delay-1000">✨</span>
        </div>
        
        {/* Nome com gradiente animado */}
        <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-500 bg-clip-text text-transparent mb-2">
          DJEONE MARTINS
        </h1>
        
        <p className="text-white text-sm tracking-widest">
          • DEVOCIONAL DIÁRIO •
        </p>
        
        {/* Divisor decorativo */}
        <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-yellow-500 to-transparent mx-auto mt-4 relative">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-500 rounded-full shadow-lg" />
        </div>
      </div>
    </header>
  )
}
