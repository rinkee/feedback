/* eslint-disable @typescript-eslint/no-empty-interface */

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module 'react' {
  export type ReactNode = any;
  export interface FC<P = any> {
    (props: P): ReactNode;
  }
  export interface ChangeEvent<T = any> { target: T }
  export interface FormEvent<T = any> {
    preventDefault(): void;
    target: T;
  }
  export function useState<T>(initial: T): [T, (val: T) => void];
  export function useEffect(fn: () => void, deps?: any[]): void;
  export function useRef<T>(initial: T | null): { current: T | null };
  export function useCallback<T extends (...args: any[]) => any>(fn: T, deps: any[]): T;
}

declare namespace React {
  type ReactNode = any;
  interface ChangeEvent<T = any> { target: T }
  interface FormEvent<T = any> {
    preventDefault(): void;
    target: T;
  }
}

declare module 'next' {
  export interface NextConfig {
    [key: string]: any;
  }
}

declare module 'next/navigation' {
  export const useParams: () => any;
  export const useRouter: () => { push: (path: string) => void };
}

declare module 'next/server' {
  export const NextResponse: any;
  export interface NextRequest {}
}

declare module 'next/link' {
  const Link: any;
  export default Link;
}

declare module 'next/font/google' {
  export const pretendard: () => { className: string };
}

declare module '@supabase/supabase-js';
declare module '@google/genai';
declare module 'lucide-react';

declare var process: {
  env: Record<string, string | undefined>;
};
