/* eslint-disable @typescript-eslint/no-empty-object-type, no-var */

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: unknown;
  }
  interface Element {}
  interface ElementClass {
    render: unknown;
  }
}

declare module 'react' {
  export type ReactNode = unknown;
  export interface ComponentType<P = unknown> {
    (props: P): unknown;
  }
  export interface FC<P = unknown> {
    (props: P): unknown;
  }
  export function useState<T>(initial: T): [T, (val: T) => void];
  export function useEffect(fn: () => unknown, deps?: unknown[]): void;
  export function useRef<T>(initial: T | null): { current: T | null };
  export interface ChangeEvent<T = unknown> { target: T }
  export interface FormEvent<T = unknown> {
    preventDefault(): void;
    target: T;
  }
}

declare namespace React {
  type ReactNode = unknown;
}

declare module 'react/jsx-runtime' {
  const jsx: unknown;
  export { jsx };
}

declare module 'next/navigation' {
  export const useParams: () => Record<string, string>;
  export const useRouter: () => { push: (path: string) => void };
}

declare module 'lucide-react';

declare module '@supabase/supabase-js';

declare module 'next/link' {
  export default function Link(props: Record<string, unknown>): JSX.Element;
}

declare module 'next/server' {
  export const NextResponse: Record<string, unknown>;
  export const NextRequest: Record<string, unknown>;
}

declare module 'next/font/google' {
  export const pretendard: () => { className: string };
}

declare module 'next' {
  export interface NextConfig {
    [key: string]: unknown;
  }
}

declare var process: {
  env: Record<string, string | undefined>;
};
