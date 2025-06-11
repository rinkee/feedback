// src/app/api/test/[id]/route.ts

import { NextResponse } from "next/server";

// FIX: 함수의 반환 타입을 Promise<Response>로 명시적으로 지정합니다.
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  // <-- 여기가 핵심 수정 부분입니다.
  const { id } = params;

  // 모든 코드 경로에서 Response 객체를 반환하도록 보장합니다.
  return NextResponse.json({ message: `Test OK for ID: ${id}` }) as Response;
}
