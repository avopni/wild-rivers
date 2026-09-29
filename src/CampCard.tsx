import type { Camp } from './game'
import { assetUrl } from './assets'

export const campInfo: Record<Camp, { image: string; description: string }> = {
  Banner: { image: assetUrl('/camp/banner.png'), description: 'Play a pair after placing to take your next turn sooner.' },
  Lantern: { image: assetUrl('/camp/lantern.png'), description: 'Play a pair after placing to take one Fairy from a board site.' },
  Provisions: { image: assetUrl('/camp/provisions.png'), description: 'Play a pair after placing to move one of your Tribe tokens to an empty space.' },
  'Fishing Nets': { image: assetUrl('/camp/fishing-nets.png'), description: 'Play a pair while collecting to take a second pearl from the same river section.' },
  Shamisen: { image: assetUrl('/camp/shamisen.png'), description: 'Play a pair after recruiting to visit a later empty Village space.' }
}

function CampTooltip({ card }: { card: Camp }) {
  return <span className="camp-tooltip" role="tooltip"><strong>{card}</strong>{campInfo[card].description}<small>Single Camp cards also pay placement costs.</small></span>
}

export function CampCard({ card, disabled, onClick }: { card: Camp; disabled?: boolean; onClick?: () => void }) {
  return <span className="camp-tip-wrap" title={`${card}: ${campInfo[card].description} Single Camp cards also pay placement costs.`}>
    <button className="camp-card" disabled={disabled} onClick={onClick} aria-label={`${card}. ${campInfo[card].description}`}><img src={campInfo[card].image} alt=""/><span>{card}</span></button>
    <CampTooltip card={card}/>
  </span>
}

export function CampBadge({ card, count }: { card: Camp; count: number }) {
  return <span className="camp-chip camp-tip-wrap" tabIndex={0} title={`${card}: ${campInfo[card].description} Single Camp cards also pay placement costs.`}>
    <img src={campInfo[card].image} alt=""/><span>{card} ×{count}</span><CampTooltip card={card}/>
  </span>
}
