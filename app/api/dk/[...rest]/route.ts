// /app/api/dk/[...rest]/route.ts
import { NextResponse } from "next/server";

const UPSTREAM_BASE = "https://str.kribb.re.kr/deepkinome";

export async function GET(
  req: Request,
  { params }: { params: { rest: string[] } }
) {
  const path = params.rest.join("/");
  const url = `${UPSTREAM_BASE}/${path}`;

  // 원본 쿼리스트링 유지
  const u = new URL(req.url);
const upstreamUrl = `${url}${u.search || ""}`;

const res = await fetch(upstreamUrl, {
  method: "GET",
  cache: "no-store",
});

const body = await res.arrayBuffer();
return new NextResponse(body, {
  status: res.status,
  headers: {
    "content-type": res.headers.get("content-type") ?? "application/octet-stream",
  },
});

}
