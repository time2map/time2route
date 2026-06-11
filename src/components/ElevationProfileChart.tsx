import { useMemo, useRef } from 'react'
import type { Chart } from 'chart.js'
import {
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartOptions,
  type ScriptableContext,
  type TooltipItem,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { getRouteStrokeColor } from '../utils/googleRouteLayer'
import type { ActivityMode, ElevationStats } from '../utils/types'

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

type ElevationProfileChartProps = {
  elevation?: ElevationStats | null
  mode?: ActivityMode
  title?: string
  activityLabel?: string
  compact?: boolean
  chartHeight?: number
  onPointHover?: (index: number | null) => void
  onPointClick?: (index: number) => void
  onChartFocusChange?: (focused: boolean) => void
}

const CHART_COLORS = {
  background: '#1a1917',
  point: '#e8e4dc',
  text: '#e8e4dc',
  mutedText: 'rgba(232, 228, 220, 0.72)',
  grid: 'rgba(232, 228, 220, 0.14)',
  border: 'rgba(232, 228, 220, 0.16)',
  card: 'rgba(232, 228, 220, 0.06)',
}

function hasChartData(elevation: ElevationStats | null | undefined): elevation is ElevationStats {
  return Boolean(elevation && elevation.profile.length > 1)
}

function roundElevationM(value: number): number {
  return Math.round(value * 100) / 100
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) {
    return `rgba(224, 107, 101, ${alpha})`
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function formatElevationTick(value: number | string): string {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return `${value} m`
  return `${roundElevationM(numeric).toFixed(2)} m`
}

function findNearestPointIndex(
  chart: Chart<'line'>,
  eventX: number,
  points: ElevationStats['profile'],
): number | null {
  const xScale = chart.scales.x
  if (!xScale || points.length === 0) return null

  const distanceKm = xScale.getValueForPixel(eventX)
  if (distanceKm === undefined || !Number.isFinite(Number(distanceKm))) return null

  let bestIndex = 0
  let bestDelta = Number.POSITIVE_INFINITY

  for (let index = 0; index < points.length; index += 1) {
    const delta = Math.abs(points[index].distanceKm - Number(distanceKm))
    if (delta < bestDelta) {
      bestDelta = delta
      bestIndex = index
    }
  }

  return bestIndex
}

function createElevationInteractionPlugin(
  onPointHoverRef: { current: ((index: number | null) => void) | undefined },
  onPointClickRef: { current: ((index: number) => void) | undefined },
  pointsRef: { current: ElevationStats['profile'] }
) {
  return {
    id: 'elevationInteraction',
    afterEvent(chart: Chart<'line'>, args: { event: { type: string; x: number | null } }) {
      const { event } = args
      if (event.x === null) return

      const index = findNearestPointIndex(chart, event.x, pointsRef.current)
      if (index === null) return

      if (event.type === 'mousemove') {
        onPointHoverRef.current?.(index)
        return
      }

      if (event.type === 'click') {
        onPointClickRef.current?.(index)
      }
    }
  }
}

function difficultyStyles(difficulty: ElevationStats['difficulty']) {
  if (difficulty === 'Easy') return { background: '#5aaab8', color: CHART_COLORS.text }
  if (difficulty === 'Moderate') return { background: '#d97a56', color: CHART_COLORS.text }
  return { background: '#c9463b', color: CHART_COLORS.text }
}

function StatCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div
      style={{
        borderRadius: 12,
        background: CHART_COLORS.card,
        border: `1px solid ${CHART_COLORS.border}`,
        padding: '10px 12px',
      }}
    >
      <div style={{ fontSize: 10, color: CHART_COLORS.mutedText, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: CHART_COLORS.text, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

function ElevationProfileChartPlaceholder({
  title,
  activityLabel,
  compact,
  chartHeight,
}: Readonly<{
  title: string
  activityLabel: string
  compact: boolean
  chartHeight?: number
}>) {
  const resolvedHeight = chartHeight ?? (compact ? 160 : 320)

  return (
    <section
      style={{
        width: '100%',
        borderRadius: 16,
        background: CHART_COLORS.background,
        boxShadow: compact ? 'none' : '0 20px 50px rgba(0, 0, 0, 0.28)',
        border: `1px solid ${CHART_COLORS.border}`,
        padding: compact ? 12 : 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: compact ? 12 : 20,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: CHART_COLORS.mutedText, marginBottom: 4 }}>
            {activityLabel} route
          </div>

          <h3
            style={{
              margin: 0,
              fontSize: compact ? 12 : 15,
              lineHeight: 1.2,
              color: CHART_COLORS.text,
            }}
          >
            {title}
          </h3>
        </div>
      </div>

      <div
        style={{
          height: resolvedHeight,
          width: '100%',
          display: 'grid',
          placeItems: 'center',
          borderRadius: 12,
          background: CHART_COLORS.card,
          border: `1px dashed ${CHART_COLORS.border}`,
          color: CHART_COLORS.mutedText,
          fontSize: compact ? 11 : 12,
        }}
      >
        Loading elevation profile…
      </div>
    </section>
  )
}

function ElevationProfileChartLoaded({
  elevation,
  mode,
  title,
  activityLabel,
  compact,
  chartHeight,
  onPointHover,
  onPointClick,
  onChartFocusChange,
}: Readonly<{
  elevation: ElevationStats
  mode: ActivityMode
  title: string
  activityLabel: string
  compact: boolean
  chartHeight?: number
  onPointHover?: (index: number | null) => void
  onPointClick?: (index: number) => void
  onChartFocusChange?: (focused: boolean) => void
}>) {
  const points = elevation.profile
  const onPointHoverRef = useRef(onPointHover)
  onPointHoverRef.current = onPointHover
  const onPointClickRef = useRef(onPointClick)
  onPointClickRef.current = onPointClick
  const onChartFocusChangeRef = useRef(onChartFocusChange)
  onChartFocusChangeRef.current = onChartFocusChange
  const pointsRef = useRef(points)
  pointsRef.current = points

  const interactionPlugin = useMemo(
    () => createElevationInteractionPlugin(onPointHoverRef, onPointClickRef, pointsRef),
    []
  )

  const elevationSpan = Math.max(elevation.maxElevationM - elevation.minElevationM, 1)
  const chartMinY = roundElevationM(
    elevation.minElevationM - Math.max(20, elevationSpan * 0.12),
  )
  const chartMaxY = roundElevationM(elevation.maxElevationM + Math.max(30, elevationSpan * 0.12))
  const routeLineColor = getRouteStrokeColor(mode)

  const data = useMemo(
    () => ({
      datasets: [
        {
          label: 'Elevation',
          data: points.map((point) => ({
            x: Math.round(point.distanceKm * 10) / 10,
            y: roundElevationM(point.elevationM),
          })),
          borderColor: routeLineColor,
          backgroundColor: (context: ScriptableContext<'line'>) => {
            const { chart } = context
            const { ctx, chartArea } = chart

            if (!chartArea) return hexToRgba(routeLineColor, 0.14)

            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
            gradient.addColorStop(0, hexToRgba(routeLineColor, 0.28))
            gradient.addColorStop(1, hexToRgba(routeLineColor, 0.03))

            return gradient
          },
          fill: true,
          tension: 0.42,
          pointRadius: compact ? 3 : 4,
          pointHoverRadius: compact ? 5 : 7,
          pointHitRadius: compact ? 14 : 18,
          pointBorderWidth: 0,
          pointBackgroundColor: CHART_COLORS.point,
          pointBorderColor: CHART_COLORS.point,
          borderWidth: compact ? 2.5 : 3,
        },
      ],
    }),
    [compact, points, routeLineColor],
  )

  const options: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      interaction: { mode: 'nearest', intersect: false, axis: 'x' },
      onClick: (_event, elements) => {
        if (elements.length > 0) {
          onPointClickRef.current?.(elements[0].index)
        }
      },
      animation: compact ? false : { duration: 600, easing: 'easeInOutQuad' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: CHART_COLORS.background,
          titleColor: CHART_COLORS.text,
          bodyColor: CHART_COLORS.text,
          borderColor: CHART_COLORS.border,
          borderWidth: 1,
          padding: 10,
          titleFont: { size: 11 },
          bodyFont: { size: 11 },
          callbacks: {
            title: (items: TooltipItem<'line'>[]) => {
              const raw = items[0].raw as { x: number; y: number }
              return `${raw.x.toFixed(1)} km`
            },
            label: (item: TooltipItem<'line'>) => {
              const raw = item.raw as { x: number; y: number }
              return `Elevation: ${roundElevationM(raw.y).toFixed(2)} m`
            },
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: elevation.totalDistanceKm,
          grid: { color: CHART_COLORS.grid },
          border: { display: false },
          ticks: {
            color: CHART_COLORS.mutedText,
            font: { size: compact ? 9 : 10 },
            callback: (value) => `${value} km`,
          },
          title: compact
            ? { display: false, text: '' }
            : {
                display: true,
                text: 'Distance',
                color: CHART_COLORS.mutedText,
                font: { size: 10, weight: 'normal' },
              },
        },
        y: {
          min: chartMinY,
          max: chartMaxY,
          grid: { color: CHART_COLORS.grid },
          border: { display: false },
          ticks: {
            color: CHART_COLORS.mutedText,
            font: { size: compact ? 9 : 10 },
            callback: (value) => formatElevationTick(value),
          },
          title: compact
            ? { display: false, text: '' }
            : {
                display: true,
                text: 'Elevation',
                color: CHART_COLORS.mutedText,
                font: { size: 10, weight: 'normal' },
              },
        },
      },
    }),
    [chartMaxY, chartMinY, compact, elevation.totalDistanceKm],
  )

  const difficulty = difficultyStyles(elevation.difficulty)

  return (
    <section
      style={{
        width: '100%',
        borderRadius: 16,
        background: CHART_COLORS.background,
        boxShadow: compact ? 'none' : '0 20px 50px rgba(0, 0, 0, 0.28)',
        border: `1px solid ${CHART_COLORS.border}`,
        padding: compact ? 12 : 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: compact ? 8 : 16,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: CHART_COLORS.mutedText, marginBottom: 2 }}>
            {activityLabel} route
          </div>

          <h3
            style={{
              margin: 0,
              fontSize: compact ? 13 : 16,
              lineHeight: 1.2,
              color: CHART_COLORS.text,
            }}
          >
            {title}
          </h3>
        </div>

        <div
          style={{
            padding: '6px 10px',
            borderRadius: 999,
            background: difficulty.background,
            color: difficulty.color,
            fontSize: 10,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {elevation.difficulty}
        </div>
      </div>

      {!compact && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            gap: 12,
            marginBottom: 22,
          }}
        >
          <StatCard label="Distance" value={`${elevation.totalDistanceKm} km`} />
          <StatCard label="Ascent" value={`+${elevation.totalAscentM} m`} />
          <StatCard label="Descent" value={`-${elevation.totalDescentM} m`} />
          <StatCard label="Lowest" value={`${elevation.minElevationM} m`} />
          <StatCard label="Highest" value={`${elevation.maxElevationM} m`} />
        </div>
      )}

      <div
        style={{
          height: chartHeight ?? (compact ? 160 : 320),
          width: '100%',
          borderRadius: 12,
          background: CHART_COLORS.background,
        }}
        onMouseEnter={() => onChartFocusChangeRef.current?.(true)}
        onMouseLeave={() => {
          onPointHoverRef.current?.(null)
          onChartFocusChangeRef.current?.(false)
        }}
      >
        <Line
          key={`elevation-${mode}-${points.length}`}
          data={data}
          options={options}
          plugins={[interactionPlugin]}
          redraw={false}
        />
      </div>
    </section>
  )
}

export function ElevationProfileChart({
  elevation,
  mode = 'walk',
  title = 'Elevation profile',
  activityLabel = 'Running',
  compact = false,
  chartHeight,
  onPointHover,
  onPointClick,
  onChartFocusChange,
}: Readonly<ElevationProfileChartProps>) {
  if (!hasChartData(elevation)) {
    return (
      <ElevationProfileChartPlaceholder
        title={title}
        activityLabel={activityLabel}
        compact={compact}
        chartHeight={chartHeight}
      />
    )
  }

  return (
    <ElevationProfileChartLoaded
      elevation={elevation}
      mode={mode}
      title={title}
      activityLabel={activityLabel}
      compact={compact}
      chartHeight={chartHeight}
      onPointHover={onPointHover}
      onPointClick={onPointClick}
      onChartFocusChange={onChartFocusChange}
    />
  )
}