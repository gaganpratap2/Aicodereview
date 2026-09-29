import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Start at `false` so the server render and the first client render agree;
  // reading window.innerWidth during render causes a hydration mismatch.
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
