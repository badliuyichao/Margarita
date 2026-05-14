interface EmptyStateProps {
  message?: string
  icon?: string
}

export default function EmptyState({
  message = '暂无数据',
  icon = '📋',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <span className="mb-4 text-5xl">{icon}</span>
      <p className="text-sm">{message}</p>
    </div>
  )
}
