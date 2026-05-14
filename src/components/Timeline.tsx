import type { ItemEvent } from '../api/items'

interface TimelineProps {
  events: ItemEvent[]
  onAddEvent: () => void
}

const eventLabels: Record<string, string> = {
  repair: '维修',
  maintenance: '保养',
  lend_out: '借出',
  retire: '退役',
  other: '其他',
}

const eventIcons: Record<string, string> = {
  repair: '🔧',
  maintenance: '🔧',
  lend_out: '📤',
  retire: '🏁',
  other: '📌',
}

export default function Timeline({ events, onAddEvent }: TimelineProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">时间线</h3>
        <button
          onClick={onAddEvent}
          className="rounded-lg px-3 py-1 text-xs text-blue-600 hover:bg-blue-50"
        >
          + 添加事件
        </button>
      </div>
      {events.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">暂无事件记录</p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex gap-3 rounded-lg border border-gray-100 bg-white p-3"
            >
              <span className="text-lg">{eventIcons[event.event_type] || '📌'}</span>
              <div className="flex-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">
                    {eventLabels[event.event_type] || event.event_type}
                  </span>
                  {event.amount != null && (
                    <span className="text-xs text-gray-500">
                      ¥{event.amount.toLocaleString()}
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="text-xs text-gray-500">{event.description}</p>
                )}
                <span className="text-[10px] text-gray-400">{event.occurred_at}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
