'use client'

import { useEffect, useState } from 'react'

type ContributionBannerProps = {
  onClick: () => void
}

const bannerImages = [
  {
    url: 'https://images.pexels.com/photos/974314/pexels-photo-974314.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=600',
    alt: 'Mãos segurando uma pequena planta',
  },
  {
    url: 'https://images.pexels.com/photos/1084540/pexels-photo-1084540.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=600',
    alt: 'Semente crescendo na terra',
  },
  {
    url: 'https://images.pexels.com/photos/4505161/pexels-photo-4505161.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=600',
    alt: 'Mãos em gesto de cuidado',
  },
  {
    url: 'https://images.pexels.com/photos/2165688/pexels-photo-2165688.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1200&h=600',
    alt: 'Campo iluminado',
  },
]

function getDailyBannerImage() {
  const now = new Date()
  const dayKey =
    now.getFullYear() * 372 + now.getMonth() * 31 + now.getDate()

  return bannerImages[dayKey % bannerImages.length]
}

export default function ContributionBanner({ onClick }: ContributionBannerProps) {
  const [image, setImage] = useState(bannerImages[0])

  useEffect(() => {
    setImage(getDailyBannerImage())
  }, [])

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir contribuição ministerial"
      className="group relative block min-h-[190px] w-full overflow-hidden rounded-[34px] border border-yellow-200/15 bg-slate-950 text-center shadow-[0_24px_80px_rgba(0,0,0,0.42)] active:scale-[0.99]"
    >
      <div className="absolute inset-0">
        <img
          src={image.url}
          alt={image.alt}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />

        <div className="absolute inset-0 bg-slate-950/72" />

        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/56 via-slate-950/54 to-slate-950/82" />

        <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-200/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-[190px] flex-col items-center justify-center px-7 py-6">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-yellow-100/85">
          Contribuição ministerial
        </p>

        <h3 className="mt-4 max-w-[20rem] text-2xl font-black leading-[1.02] tracking-[-0.055em] text-white drop-shadow-[0_5px_18px_rgba(0,0,0,0.82)]">
          Semeie naquilo que edifica vidas.
        </h3>

        <div className="my-5 h-px w-20 bg-gradient-to-r from-transparent via-yellow-100/80 to-transparent" />

        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.28em] text-yellow-100/75">
          Toque para contribuir
        </p>
      </div>
    </button>
  )
}

