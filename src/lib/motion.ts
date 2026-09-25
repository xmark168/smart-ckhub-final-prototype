/** "smooth" unless the user asked the OS to reduce motion. */
export function motionBehavior(): ScrollBehavior {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}
