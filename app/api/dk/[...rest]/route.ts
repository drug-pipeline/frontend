import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // 캐시 방지
export const runtime = "nodejs";

type Ctx = { params: { parts: string[] } };

const UPSTREAM = process.env.DK_UPSTREAM_BASE
  ?? "https://str.kribb.re.kr/deepkinome/api";

function join(a: string, b: string) {
  return `${a.replace(/\/+$/, "")}/${b.replace(/^\/+/, "")}`;
}

export async function GET(req: Request, { params }: Ctx) {
  const url = new URL(req.url);
  const path = params.parts.join("/"); // e.g. "prediction"
  const upstreamUrl = new URL(join(UPSTREAM, path));

  // 쿼리 그대로 전달
  upstreamUrl.search = url.search;

  const res = await fetch(upstreamUrl.toString(), {
    method: "GET",
    // 필요한 경우 헤더 전달
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  return new NextResponse(res.body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });
}
