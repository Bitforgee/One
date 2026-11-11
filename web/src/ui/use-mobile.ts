import * as React from "react"

const MOBILE_BREAKPOINT = 768

export const Celular = '(max-width: 767px), (max-height: 479px) and (pointer: coarse)'
export const Deitado = '(max-height: 479px)'

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function useConsulta(consulta: string) {
  const [vale, setVale] = React.useState(() => !!window.matchMedia?.(consulta).matches)
  React.useEffect(() => {
    const mql = window.matchMedia?.(consulta)
    if (!mql) return
    const muda = () => setVale(mql.matches)
    mql.addEventListener('change', muda)
    return () => mql.removeEventListener('change', muda)
  }, [consulta])
  return vale
}
