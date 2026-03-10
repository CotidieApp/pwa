import React from 'react'

export function handleTouchNavigation(
  e: React.MouseEvent<HTMLElement>,
  onPrev?: () => void,
  onNext?: () => void
) {
  const target = e.target as HTMLElement

  const interactive = target.closest(
    'button, a, input, textarea, select, [role="button"], [data-no-touch-nav]'
  )

  if (interactive) return

  if (window.getSelection()?.toString()) return

  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = e.clientX - rect.left
  const width = rect.width

  if (x < width * 0.33) {
    onPrev?.()
  } else if (x > width * 0.66) {
    onNext?.()
  }
}