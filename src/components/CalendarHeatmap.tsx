import { useMemo } from 'react'

interface CalendarHeatmapProps {
  checkDates: string[]
  onCheckIn: () => void
  todayChecked: boolean
}

export default function CalendarHeatmap({ checkDates, onCheckIn, todayChecked }: CalendarHeatmapProps) {
  const weeks = useMemo(() => {
    const today = new Date()
    const result: Date[][] = []
    let currentWeek: Date[] = []

    // Show last 12 weeks
    const start = new Date(today)
    start.setDate(start.getDate() - 84)
    start.setDate(start.getDate() - start.getDay())

    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      if (currentWeek.length === 7) {
        result.push(currentWeek)
        currentWeek = []
      }
      currentWeek.push(new Date(d))
    }
    if (currentWeek.length > 0) result.push(currentWeek)
    return result
  }, [])

  const checkedSet = useMemo(() => new Set(checkDates), [checkDates])

  const getColor = (date: Date) => {
    const key = date.toISOString().slice(0, 10)
    if (checkedSet.has(key)) return 'bg-green-400'
    return 'bg-gray-200'
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">打卡记录</h3>
        <button
          onClick={onCheckIn}
          disabled={todayChecked}
          className={`rounded-lg px-4 py-1.5 text-xs font-medium text-white transition-colors ${
            todayChecked
              ? 'cursor-not-allowed bg-gray-300'
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {todayChecked ? '今日已打卡' : '今日打卡'}
        </button>
      </div>
      <div className="flex gap-0.5 overflow-x-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((date, di) => (
              <div
                key={di}
                className={`h-3 w-3 rounded-sm ${getColor(date)}`}
                title={date.toISOString().slice(0, 10)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
