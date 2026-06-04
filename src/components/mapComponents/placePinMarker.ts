export function createPlacePinElement(params: {
  index: number
  title: string
  color: string
  active?: boolean
}): HTMLDivElement {
  const { index, title, color, active = false } = params
  const dotRadius = active ? 10 : 8
  const dotY = active ? -14 : -15
  const dotSize = active ? 14 : 10
  const dotFill = active ? color : '#fff'
  const dotStroke = color
  const dotGlyphColor = active ? '#fff' : color

  const wrapper = document.createElement('div')
  wrapper.className = `place-pin-marker ${active ? 'is-active' : ''}`
  wrapper.dataset.place = String(index)
  wrapper.title = title

  wrapper.innerHTML = `
    <svg
      class="place-pin-svg"
      width="44"
      height="56"
      viewBox="-22 -46 44 56"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <filter id="placePinShadow-${index}" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="rgba(15,23,42,0.25)" />
        </filter>
      </defs>

      <g class="place-pin" data-place="${index}">
        <circle
          cx="0"
          cy="-18"
          r="${dotRadius}"
          fill="${dotFill}"
          stroke="${dotStroke}"
          stroke-width="2"
          filter="url(#placePinShadow-${index})"
          class="pin-dot"
        ></circle>

        <text
          x="0"
          y="${dotY}"
          text-anchor="middle"
          fill="${dotGlyphColor}"
          font-size="${dotSize}"
          font-weight="600"
          class="pin-dot"
        >●</text>

        <path
          d="M0-10 V10"
          stroke="${color}"
          stroke-width="2"
          stroke-linecap="round"
        ></path>
      </g>
    </svg>
  `

  return wrapper
}
