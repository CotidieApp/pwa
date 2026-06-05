import React from 'react'

export const TOUCH_NAV_INTERACTIVE_SELECTORS =
  'button, a, input, textarea, select, [role="button"]'

const DEFAULT_TOUCH_NAV_BLOCKED_SELECTORS = `${TOUCH_NAV_INTERACTIVE_SELECTORS}, [data-no-touch-nav]`

type TouchNavigationOptions = {
  blockedSelectors?: string
}

export function handleTouchNavigation(
  e: React.MouseEvent<HTMLElement>,
  onPrev?: () => void,
  onNext?: () => void,
  options?: TouchNavigationOptions
) {
  const target = e.target as HTMLElement

  const interactive = target.closest(
    options?.blockedSelectors ?? DEFAULT_TOUCH_NAV_BLOCKED_SELECTORS
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
