declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface Element {}
  interface ElementClass {
    render: any;
  }
}

declare module 'react' {
  export type ReactNode = any;
  export interface ComponentType<P = any> {
    (props: P): any;
  }
  export interface FC<P = any> {
    (props: P): any;
  }
  export function useState<T>(initial: T): [T, (val: T) => void];
  export function useEffect(fn: () => any, deps?: any[]): void;
  export function useRef<T>(initial: T | null): { current: T | null };
  export interface ChangeEvent<T = any> { target: T }
  export interface FormEvent<T = any> {
    preventDefault(): void;
    target: T;
  }
}

declare module 'react/jsx-runtime' {
  const jsx: any;
  export { jsx };
}

declare module 'next/navigation' {
  export const useParams: any;
  export const useRouter: any;
}

declare module 'lucide-react';

declare module '@supabase/supabase-js';

declare var process: {
  env: Record<string, string | undefined>;
};
