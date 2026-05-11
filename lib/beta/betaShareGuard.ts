const betaShareMessage =
  'Este é um teste do Beta Fechado. Compartilhe apenas com você mesmo no WhatsApp ou no grupo oficial dos testadores beta. Não envie para pessoas fora do grupo.'

export function confirmBetaShareRestriction(isBetaTester: boolean) {
  if (!isBetaTester) return true

  return window.confirm(betaShareMessage)
}
