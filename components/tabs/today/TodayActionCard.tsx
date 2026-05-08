type TodayActionCardProps = {
  eyebrow: string
  title: string
  subtitle: string
  meta?: string
  icon?: string
  accent?: 'blue' | 'gold' | 'green'
  onClick: () => void
}

const imageSets = {
  blue: [
    {
      url: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=600',
      alt: 'Livros abertos representando leitura bíblica',
    },
    {
      url: 'https://images.pexels.com/photos/267559/pexels-photo-267559.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=600',
      alt: 'Livro aberto com luz suave',
    },
    {
      url: 'https://images.pexels.com/photos/256450/pexels-photo-256450.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=600',
      alt: 'Mesa de estudo com livros',
    },
  ],
  gold: [
    {
      url: 'https://images.pexels.com/photos/208371/pexels-photo-208371.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=600',
      alt: 'Luz suave entrando em uma igreja',
    },
    {
      url: 'https://images.pexels.com/photos/415571/pexels-photo-415571.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=600',
      alt: 'Momento de oração e silêncio',
    },
    {
      url: 'https://images.pexels.com/photos/3723263/pexels-photo-3723263.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=600',
      alt: 'Ambiente calmo de meditação e oração',
    },
  ],
  green: [
    {
      url: 'https://images.pexels.com/photos/2165688/pexels-photo-2165688.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=600',
      alt: 'Campo iluminado por luz suave',
    },
    {
      url: 'https://images.pexels.com/photos/974314/pexels-photo-974314.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=600',
      alt: 'Mãos segurando uma pequena planta',
    },
  ],
}

function getDailyImage(accent: 'blue' | 'gold' | 'green') {
  const images = imageSets[accent] || imageSets.blue
  const now = new Date()
  const dayKey =
    now.getFullYear() * 372 + now.getMonth() * 31 + now.getDate()

  return images[dayKey % images.length]
}

function getAccentStyles(accent: 'blue' | 'gold' | 'green') {
  if (accent === 'gold') {
    return {
      border: 'border-yellow-200/15',
      eyebrow: 'text-yellow-100/90',
      line: 'from-transparent via-yellow-100/80 to-transparent',
      glow: 'bg-yellow-200/10',
      meta: 'text-yellow-100/80',
    }
  }

  if (accent === 'green') {
    return {
      border: 'border-emerald-200/15',
      eyebrow: 'text-emerald-100/90',
      line: 'from-transparent via-emerald-100/75 to-transparent',
      glow: 'bg-emerald-200/10',
      meta: 'text-emerald-100/80',
    }
  }

  return {
    border: 'border-blue-200/15',
    eyebrow: 'text-blue-100/90',
    line: 'from-transparent via-blue-100/75 to-transparent',
    glow: 'bg-blue-200/10',
    meta: 'text-blue-100/80',
  }
}

export default function TodayActionCard({
  eyebrow,
  title,
  subtitle,
  meta,
  accent = 'blue',
  onClick,
}: TodayActionCardProps) {
  const image = getDailyImage(accent)
  const styles = getAccentStyles(accent)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative block min-h-[170px] w-full overflow-hidden rounded-[34px] border ${styles.border} bg-slate-950 text-center shadow-[0_24px_80px_rgba(0,0,0,0.42)] active:scale-[0.99]`}
    >
      <div className="absolute inset-0">
        <img
          src={image.url}
          alt={image.alt}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />

        <div className="absolute inset-0 bg-slate-950/52" />

        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/46 via-slate-950/36 to-slate-950/68" />

        <div className={`absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full ${styles.glow} blur-3xl`} />
      </div>

      <div className="relative flex min-h-[170px] flex-col items-center justify-center px-7 py-6">
        <p className={`text-[10px] font-black uppercase tracking-[0.32em] ${styles.eyebrow}`}>
          {eyebrow}
        </p>

        <h3 className="mt-4 max-w-[20rem] text-2xl font-black leading-[1.02] tracking-[-0.055em] text-white drop-shadow-[0_5px_18px_rgba(0,0,0,0.82)]">
          {title}
        </h3>

        <div className={`my-4 h-px w-20 bg-gradient-to-r ${styles.line}`} />

        {meta && (
          <p className={`mt-1 text-[10px] font-black uppercase tracking-[0.28em] ${styles.meta}`}>
            {meta}
          </p>
        )}
      </div>
    </button>
  )
}

