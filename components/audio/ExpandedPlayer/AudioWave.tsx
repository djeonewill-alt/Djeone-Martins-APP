type AudioWaveProps = {
  isPlaying: boolean
  currentTime: number
  captionsEnabled: boolean
}

function buildWavePath({
  phase,
  amplitude,
  frequency,
  verticalOffset,
}: {
  phase: number
  amplitude: number
  frequency: number
  verticalOffset: number
}) {
  const points = Array.from({ length: 150 }).map((_, index) => {
    const x = (index / 149) * 100

    const y =
      verticalOffset +
      Math.sin(index * frequency + phase) * amplitude +
      Math.sin(index * frequency * 0.42 + phase * 0.75) * (amplitude * 0.58) +
      Math.cos(index * frequency * 0.18 + phase * 0.45) * (amplitude * 0.28)

    return `${x.toFixed(2)},${y.toFixed(2)}`
  })

  return `M ${points.join(' L ')}`
}

export default function AudioWave({
  isPlaying,
  currentTime,
  captionsEnabled,
}: AudioWaveProps) {
  const phase = isPlaying ? currentTime * 2.35 : 0.8

  const blueLines = Array.from({ length: 18 }).map((_, index) => {
    return buildWavePath({
      phase: phase + index * 0.16,
      amplitude: 15 + index * 0.22,
      frequency: 0.095 + index * 0.0014,
      verticalOffset: 54 + (index - 9) * 0.82,
    })
  })

  const goldLines = Array.from({ length: 16 }).map((_, index) => {
    return buildWavePath({
      phase: phase * 0.82 + index * 0.2 + 1.8,
      amplitude: 12 + index * 0.2,
      frequency: 0.112 + index * 0.0015,
      verticalOffset: 56 + (index - 8) * 0.78,
    })
  })

  const whiteLines = Array.from({ length: 8 }).map((_, index) => {
    return buildWavePath({
      phase: phase * 0.6 + index * 0.22 + 2.5,
      amplitude: 9 + index * 0.12,
      frequency: 0.088 + index * 0.0012,
      verticalOffset: 55 + (index - 4) * 0.9,
    })
  })

  return (
    <div
      className="relative overflow-hidden rounded-[22px] bg-slate-950 transition-all duration-300"
      style={{
        height: captionsEnabled ? '176px' : '330px',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.20),transparent_34%),radial-gradient(circle_at_68%_50%,rgba(234,179,8,0.16),transparent_36%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(2,6,23,1))]" />

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="expandedWaveBlue" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(147,197,253,0.10)" />
            <stop offset="25%" stopColor="rgba(96,165,250,0.80)" />
            <stop offset="55%" stopColor="rgba(56,189,248,0.62)" />
            <stop offset="100%" stopColor="rgba(37,99,235,0.18)" />
          </linearGradient>

          <linearGradient id="expandedWaveGold" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(234,179,8,0.08)" />
            <stop offset="38%" stopColor="rgba(250,204,21,0.84)" />
            <stop offset="72%" stopColor="rgba(234,179,8,0.54)" />
            <stop offset="100%" stopColor="rgba(202,138,4,0.16)" />
          </linearGradient>

          <linearGradient id="expandedWaveWhite" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.32)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
          </linearGradient>
        </defs>

        <g transform="translate(-9 0) scale(1.22 1)">
          {blueLines.map((path, index) => (
            <path
              key={`blue-${index}`}
              d={path}
              fill="none"
              stroke="url(#expandedWaveBlue)"
              strokeWidth="0.28"
              strokeLinecap="round"
              opacity={isPlaying ? 0.9 : 0.52}
            />
          ))}

          {goldLines.map((path, index) => (
            <path
              key={`gold-${index}`}
              d={path}
              fill="none"
              stroke="url(#expandedWaveGold)"
              strokeWidth="0.26"
              strokeLinecap="round"
              opacity={isPlaying ? 0.86 : 0.48}
            />
          ))}

          {whiteLines.map((path, index) => (
            <path
              key={`white-${index}`}
              d={path}
              fill="none"
              stroke="url(#expandedWaveWhite)"
              strokeWidth="0.2"
              strokeLinecap="round"
              opacity={isPlaying ? 0.62 : 0.32}
            />
          ))}
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.76),transparent_18%,transparent_82%,rgba(2,6,23,0.72))]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950 via-slate-950/55 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-slate-950 via-slate-950/40 to-transparent" />
    </div>
  )
}
