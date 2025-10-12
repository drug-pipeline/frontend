// app/api/dk/[...rest]/route.ts
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPSTREAM_BASE =
  process.env.DK_UPSTREAM_BASE ?? "https://str.kribb.re.kr/deepkinome";

type ParamsP = Promise<{ rest?: string[] }>;

function toUpstreamPath(segments: string[]) {
  const segs = segments.length
    ? (segments[0] === "api" ? segments : ["api", ...segments])
    : ["api"];
  return segs.map(encodeURIComponent).join("/");
}

const FORWARD_HEADER_WHITELIST = new Set([
  "content-type",
  "content-disposition",
  "etag",
  "last-modified",
  "cache-control",
  "expires",
]);

function pickHeaders(h: Headers) {
  const out = new Headers();
  for (const [k, v] of h.entries()) {
    const key = k.toLowerCase();
    if (FORWARD_HEADER_WHITELIST.has(key)) out.set(key, v);
  }
  return out;
}

async function fetchWithRetry(url: string, init: RequestInit, retries = 2, delayMs = 180) {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetch(url, {
        cache: "no-store",
        ...init,
        headers: {
          ...(init.headers ?? {}),
          // 업스트림 압축 비활성화 → 바디/헤더 불일치 방지
          "accept-encoding": "identity",
          // (옵션) keep-alive 힌트
          "connection": "keep-alive",
        },
      });
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

export async function GET(
  request: NextRequest,
  context: { params: ParamsP }
) {
  const { rest = [] } = await context.params;

  const upstreamUrl = new URL(`${UPSTREAM_BASE}/${toUpstreamPath(rest)}`);
  request.nextUrl.searchParams.forEach((v, k) =>
    upstreamUrl.searchParams.set(k, v)
  );

  // ✅ 스트리밍 대신 "버퍼링"으로 우회 (파이프 중단 이슈 해결)
  //  - 파일이 작은 편이라 메모리 부담 거의 없음
  //  - 소켓이 중간에 닫혀도 전체 바디를 다 받은 다음 응답 생성
  const upstreamRes = await fetchWithRetry(upstreamUrl.toString(), {});
  const headers = pickHeaders(upstreamRes.headers);

  // 바디를 통째로 확보
  let body: ArrayBuffer;
  try {
    body = await upstreamRes.arrayBuffer();
  } catch {
    // 혹시 여기서 끊겨도 1회 재시도
    const retry = await fetchWithRetry(upstreamUrl.toString(), {});
    body = await retry.arrayBuffer();
    // 헤더 갱신
    const h2 = pickHeaders(retry.headers);
    headers.forEach((_, k) => headers.delete(k));
    h2.forEach((v, k) => headers.set(k, v));
  }

  // content-length는 우리가 보낸 크기로 확정
  headers.set("content-length", String(body.byteLength));
  // 압축 없음(accept-encoding: identity) 가정 → content-encoding 제거
  headers.delete("content-encoding");

  return new Response(body, {
    status: upstreamRes.status,
    headers,
  });
}
