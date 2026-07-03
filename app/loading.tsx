export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="relative mx-auto mb-4 h-14 w-14">
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-blue-400 border-r-blue-400/40" />
          <div className="absolute inset-2 animate-spin rounded-full border-[3px] border-transparent border-t-blue-300/60 border-r-blue-300/20" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
        </div>
        <p className="text-sm font-medium text-slate-300">Preparando seu devocional...</p>
      </div>
    </div>
  )
}