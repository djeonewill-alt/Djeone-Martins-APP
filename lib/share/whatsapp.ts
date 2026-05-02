export function shareEpisodeWhatsApp(episode: {
  id: string
  title: string
  bible_reference: string
  series_title?: string
}) {
  const appUrl = window.location.origin
  const episodeUrl = `${appUrl}/ep/${episode.id}`
  
  const message = `🎙️ *Ouça o devocional de hoje!*

📖 ${episode.bible_reference}
"${episode.title}"

👇 Clique aqui para ouvir:
${episodeUrl}

⚡ *Instale o app no seu celular e receba notificações diárias!*`

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
  
  window.open(whatsappUrl, '_blank')
}