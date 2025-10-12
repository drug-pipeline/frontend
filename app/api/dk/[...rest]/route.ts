// app/api/dk/[...rest]/route.ts
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Node 런타임에서 스트리밍 안정

const UPSTREAM_BASE =
  process.env.DK_UPSTREAM_BASE ?? "https://str.kribb.re.kr/deepkinome"; // no trailing slash

function toUpstreamPath(segments: string[]) {
  // 내부: /api/dk/<segments...>
  // 외부: /deepkinome/api/<segments...>  (선두 'api' 없으면 자동 추가)
  const segs =
    segments.length > 0
      ? segments[0] === "api"
        ? segments
        : ["api", ...segments]
      : ["api"];
  return segs.map(encodeURIComponent).join("/");
}

// 짧은 재시도 래퍼 (UND_ERR_SOCKET 등 일시 오류 완화)
async function fetchWithRetry(url: string, init: RequestInit, retries = 1, delayMs = 150) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, { cache: "no-store", ...init });
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  // 이 지점은 도달하지 않음
  throw new Error("unreachable");
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ rest?: string[] }> }
) {
  // ✅ Next 15 요구사항: params는 Promise이므로 먼저 await
  const { rest = [] } = await context.params;

  // 업스트림 URL 구성
  const upstreamUrl = new URL(`${UPSTREAM_BASE}/${toUpstreamPath(rest)}`);
  request.nextUrl.searchParams.forEach((v, k) => upstreamUrl.searchParams.set(k, v));

  // 업스트림 호출 (스트리밍 패스스루)
  const upstreamRes = await fetchWithRetry(upstreamUrl.toString(), {});

  // 필요한 헤더만 선별 전달 (콘텐츠 타입/디스포지션)
  const outHeaders = new Headers();
  const ct = upstreamRes.headers.get("content-type");
  if (ct) outHeaders.set("content-type", ct);
  const cd = upstreamRes.headers.get("content-disposition");
  if (cd) outHeaders.set("content-disposition", cd);

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: outHeaders,
  });
}
