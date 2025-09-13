// Minimal module shims to quiet TS/IDE errors when type packages are not installed.
declare module 'framer-motion' {
  // Minimal shim: `motion` is an object with intrinsic element wrappers (motion.div, motion.span, etc.)
  import type { ComponentType, PropsWithChildren } from 'react'
  type MotionElement = ComponentType<PropsWithChildren<Record<string, unknown>>>
  export const motion: { [K in keyof JSX.IntrinsicElements]: MotionElement } & { [key: string]: MotionElement }
  export const AnimatePresence: ComponentType<PropsWithChildren<Record<string, unknown>>>
  export type MotionProps = Record<string, unknown>
  export default motion
}

declare module 'next/app' {
  import type { AppProps } from 'next/app'
  export type { AppProps }
}

declare module 'next/head' {
  import type { ComponentType } from 'react'
  const Head: ComponentType<Record<string, unknown>>
  export default Head
}

declare module 'react-redux' {
  import type { ComponentType, PropsWithChildren } from 'react'
  export const Provider: ComponentType<PropsWithChildren<{ store?: unknown }>>
  export function useDispatch<T = unknown>(): T
  export function useSelector<T = unknown>(selector?: (state: unknown) => T): T
}

declare module '@reduxjs/toolkit' {
  export function configureStore(opts?: Record<string, unknown>): { getState: () => unknown; dispatch: (...args: unknown[]) => unknown }
  export function createSlice(opts?: Record<string, unknown>): unknown
}

declare module 'lucide-react' {
  import type { ComponentType, SVGProps } from 'react'
  export const Home: ComponentType<SVGProps<SVGSVGElement>>
  export const Package: ComponentType<SVGProps<SVGSVGElement>>
  export const Users: ComponentType<SVGProps<SVGSVGElement>>
  export const Settings: ComponentType<SVGProps<SVGSVGElement>>
  export const LogOut: ComponentType<SVGProps<SVGSVGElement>>
}
