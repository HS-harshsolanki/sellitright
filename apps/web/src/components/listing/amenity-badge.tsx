interface AmenityBadgeProps {
  name: string
}

export function AmenityBadge({ name }: AmenityBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
      {name}
    </span>
  )
}
