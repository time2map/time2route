import { useMemo } from 'react'
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

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

export type ElevationPoint = {
  distanceKm: number
  elevationM: number
}

type ElevationProfileChartProps = {
  points?: ElevationPoint[]
  title?: string
  activityLabel?: string
  compact?: boolean
  chartHeight?: number
}

const CHART_COLORS = {
  background: '#1a1917',
  line: '#e06b65',
  point: '#e8e4dc',
  text: '#e8e4dc',
  mutedText: 'rgba(232, 228, 220, 0.72)',
  grid: 'rgba(232, 228, 220, 0.14)',
  border: 'rgba(232, 228, 220, 0.16)',
  card: 'rgba(232, 228, 220, 0.06)',
}

function hasChartData(points: ElevationPoint[] | undefined): points is ElevationPoint[] {
  return Boolean(points && points.length > 1)
}

function calculateElevationStats(points: ElevationPoint[]) {
  let ascent = 0
  let descent = 0

  for (let index = 1; index < points.length; index += 1) {
    const diff = points[index].elevationM - points[index - 1].elevationM
    if (diff > 0) ascent += diff
    else descent += Math.abs(diff)
  }

  const elevations = points.map((point) => point.elevationM)
  const distances = points.map((point) => point.distanceKm)
  const minElevation = Math.min(...elevations)
  const maxElevation = Math.max(...elevations)
  const totalDistance = Math.max(...distances)

  let difficulty = 'Challenging'
  if (ascent < 50) difficulty = 'Easy'
  else if (ascent < 150) difficulty = 'Moderate'

  return {
    ascent: Math.round(ascent),
    descent: Math.round(descent),
    minElevation: Math.round(minElevation),
    maxElevation: Math.round(maxElevation),
    totalDistance: Number(totalDistance.toFixed(1)),
    difficulty,
  }
}

function difficultyStyles(difficulty: string) {
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
      <div style={{ fontSize: 12, color: CHART_COLORS.mutedText, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, color: CHART_COLORS.text, fontWeight: 700 }}>{value}</div>
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
          <div style={{ fontSize: 13, color: CHART_COLORS.mutedText, marginBottom: 4 }}>
            {activityLabel} route
          </div>

          <h3
            style={{
              margin: 0,
              fontSize: compact ? 16 : 22,
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
          fontSize: compact ? 13 : 14,
        }}
      >
        Loading elevation profile…
      </div>
    </section>
  )
}

function ElevationProfileChartLoaded({
  points,
  title,
  activityLabel,
  compact,
  chartHeight,
}: Readonly<{
  points: ElevationPoint[]
  title: string
  activityLabel: string
  compact: boolean
  chartHeight?: number
}>) {
  const stats = useMemo(() => calculateElevationStats(points), [points])
  const chartMinY = Math.max(0, stats.minElevation - 20)
  const chartMaxY = stats.maxElevation + 30

  const data = useMemo(
    () => ({
      datasets: [
        {
          label: 'Elevation',
          data: points.map((point) => ({ x: point.distanceKm, y: point.elevationM })),
          borderColor: CHART_COLORS.line,
          backgroundColor: (context: ScriptableContext<'line'>) => {
            const { chart } = context
            const { ctx, chartArea } = chart

            if (!chartArea) return 'rgba(224, 107, 101, 0.14)'

            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
            gradient.addColorStop(0, 'rgba(224, 107, 101, 0.28)')
            gradient.addColorStop(1, 'rgba(224, 107, 101, 0.03)')

            return gradient
          },
          fill: true,
          tension: 0.42,
          pointRadius: compact ? 2 : 3,
          pointHoverRadius: compact ? 4 : 6,
          pointBorderWidth: 0,
          pointBackgroundColor: CHART_COLORS.point,
          pointBorderColor: CHART_COLORS.point,
          borderWidth: compact ? 2.5 : 3,
        },
      ],
    }),
    [compact, points],
  )

  const options: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      interaction: { mode: 'nearest', intersect: false },
      animation: { duration: 1000, easing: 'easeInOutQuad' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: CHART_COLORS.background,
          titleColor: CHART_COLORS.text,
          bodyColor: CHART_COLORS.text,
          borderColor: CHART_COLORS.border,
          borderWidth: 1,
          padding: 12,
          callbacks: {
            title: (items: TooltipItem<'line'>[]) => {
              const raw = items[0].raw as { x: number; y: number }
              return `${raw.x.toFixed(1)} km`
            },
            label: (item: TooltipItem<'line'>) => {
              const raw = item.raw as { x: number; y: number }
              return `Elevation: ${Math.round(raw.y)} m`
            },
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: stats.totalDistance,
          grid: { color: CHART_COLORS.grid },
          border: { display: false },
          ticks: {
            color: CHART_COLORS.mutedText,
            callback: (value) => `${value} km`,
          },
          title: compact
            ? { display: false, text: '' }
            : {
                display: true,
                text: 'Distance',
                color: CHART_COLORS.mutedText,
                font: { size: 12, weight: 'normal' },
              },
        },
        y: {
          min: chartMinY,
          max: chartMaxY,
          grid: { color: CHART_COLORS.grid },
          border: { display: false },
          ticks: {
            color: CHART_COLORS.mutedText,
            callback: (value) => `${value} m`,
          },
          title: compact
            ? { display: false, text: '' }
            : {
                display: true,
                text: 'Elevation',
                color: CHART_COLORS.mutedText,
                font: { size: 12, weight: 'normal' },
              },
        },
      },
    }),
    [chartMaxY, chartMinY, compact, stats.totalDistance],
  )

  const difficulty = difficultyStyles(stats.difficulty)

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
          <div style={{ fontSize: 13, color: CHART_COLORS.mutedText, marginBottom: 4 }}>
            {activityLabel} route
          </div>

          <h3
            style={{
              margin: 0,
              fontSize: compact ? 16 : 22,
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
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {stats.difficulty}
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
          <StatCard label="Distance" value={`${stats.totalDistance} km`} />
          <StatCard label="Ascent" value={`+${stats.ascent} m`} />
          <StatCard label="Descent" value={`-${stats.descent} m`} />
          <StatCard label="Lowest" value={`${stats.minElevation} m`} />
          <StatCard label="Highest" value={`${stats.maxElevation} m`} />
        </div>
      )}

      <div
        style={{
          height: chartHeight ?? (compact ? 160 : 320),
          width: '100%',
          borderRadius: 12,
          background: CHART_COLORS.background,
        }}
      >
        <Line data={data} options={options} />
      </div>
    </section>
  )
}

export function ElevationProfileChart({
  points,
  title = 'Elevation profile',
  activityLabel = 'Running',
  compact = false,
  chartHeight,
}: Readonly<ElevationProfileChartProps>) {
  if (!hasChartData(points)) {
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
      points={points}
      title={title}
      activityLabel={activityLabel}
      compact={compact}
      chartHeight={chartHeight}
    />
  )
}