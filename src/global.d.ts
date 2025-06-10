/* eslint-disable @typescript-eslint/no-empty-interface */

type StubReactNode =
  | string
  | number
  | boolean
  | null
  | undefined
  | { [key: string]: unknown }
  | StubReactNode[];

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: {
      children?: StubReactNode;
      [key: string]: unknown;
    };
  }
}

declare module 'react' {
  export type ReactNode =
    | string
    | number
    | boolean
    | null
    | undefined
    | ReactElement
    | ReactNode[];
  export interface ReactElement {
    [key: string]: unknown;
  }
  export interface FC<P = Record<string, unknown>> {
    (props: P): ReactNode;
  }
  export interface ComponentType<P = Record<string, unknown>> {
    (props: P): ReactNode;
  }
  export interface ChangeEvent<T = Element> {
    target: T;
  }
  export interface FormEvent<T = Element> {
    preventDefault(): void;
    target: T;
  }
  export function useState<T>(initial: T): [T, (val: T) => void];
  export function useEffect(fn: () => void, deps?: unknown[]): void;
  export function useRef<T>(initial: T | null): { current: T | null };
  export function useCallback<T extends (...args: unknown[]) => unknown>(fn: T, deps: unknown[]): T;
}

declare namespace React {
  type ReactNode =
    | string
    | number
    | boolean
    | null
    | undefined
    | ReactElement
    | ReactNode[];
  interface ReactElement {
    [key: string]: unknown;
  }
  interface ChangeEvent<T = Element> {
    target: T;
  }
  interface FormEvent<T = Element> {
    preventDefault(): void;
    target: T;
  }
}

declare module 'next' {
  export interface NextConfig {
    [key: string]: unknown;
  }
}

declare module 'next/navigation' {
  export const useParams: () => Record<string, string>;
  export const useRouter: () => { push: (path: string) => void };
}

declare module 'next/server' {
  export const NextResponse: {
    json(body: unknown, init?: { status?: number }): unknown;
  };
  export interface NextRequest {
    json(): Promise<unknown>;
    headers: { get(name: string): string | null };
  }
}

declare module 'next/link' {
  const Link: React.FC<Record<string, unknown>>;
  export default Link;
}

declare module 'next/font/google' {
  export const pretendard: () => { className: string };
}

declare module '@supabase/supabase-js';
declare module '@google/genai';
declare module 'lucide-react';

declare const process: {
  env: Record<string, string | undefined>;
};
