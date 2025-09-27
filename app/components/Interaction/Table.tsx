// components/interaction/Table.tsx
"use client";

import React from "react";

/* ===== Shared types (exported) ===== */
export type Mode = "atom" | "residue";

export type AtomRow = {
  Atom1: string; // "Chain / Res No. / Res Name / Atom / Serial" 조합 텍스트
  Atom2: string;
  "Interaction Type": string;
  "Distance(Å)": string; // UI에는 Å, CSV엔 Distance
  "Angle(°)": string; // UI에는 °, CSV엔 Angle
};

export type ResidueRow = {
  Count: number;
  Atom1: string; // Residue1: "Chain / Res No. / Res Name"
  Atom2: string; // Residue2
  "Interaction Type": string;
};

export type TypeColor = {
  bg: string;
  text: string;
  ring: string;
  hover?: string;
};

/* ===== Local helpers (no any) ===== */
type PageSize = 10 | 25 | 50 | 100;

function usePagination<T>(rows: T[], initialSize: PageSize = 10) {
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<PageSize>(initialSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, rows.length);
  const pageRows = rows.slice(start, end);

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    start,
    end,
    pageRows,
    totalCount: rows.length,
  };
}

/** CSV 문자열 생성 (헤더 순서 지정 가능) */
function toCSV(
  rows: Array<Record<string, string | number>>,
  headers?: string[]
): string {
  if (rows.length === 0) return "";
  const cols = headers ?? Object.keys(rows[0]);
  const escape = (v: string | number): string => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const head = cols.join(",");
  const body = rows
    .map((r) => cols.map((c) => escape(r[c] as string | number)).join(","))
    .join("\n");
  return head + "\n" + body;
}

/** 파일 다운로드 (UTF-8 BOM 추가로 Å, ° 깨짐 방지) */
function downloadTextFile(filename: string, content: string) {
  const bom = "\uFEFF"; // Excel 호환을 위한 UTF-8 BOM
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ===== UI atoms ===== */
function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={
        "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-900 " +
        className
      }
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  mono,
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  mono?: boolean;
  className?: string;
}) {
  return (
    <td
      className={
        "px-3 py-2 text-sm text-zinc-900 " +
        (mono ? "tabular-nums font-mono " : "") +
        (align === "right"
          ? "text-right "
          : align === "center"
          ? "text-center "
          : "") +
        className
      }
    >
      {children}
    </td>
  );
}

/** 작은 서브 라벨 */
function SubLabel({ text }: { text: string }) {
  return (
    <div className="pt-0.5 text-[10px] font-normal normal-case leading-3 text-zinc-500">
      {text}
    </div>
  );
}

function PageSizeSelect({
  value,
  onChange,
}: {
  value: PageSize;
  onChange: (v: PageSize) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-zinc-900">
      Rows per page
      <select
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as PageSize)}
      >
        {[10, 25, 50, 100].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}

function Pager({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <button
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 enabled:hover:bg-zinc-50 disabled:opacity-40"
        onClick={onPrev}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        ◀
      </button>
      <span className="text-xs text-zinc-900">
        {page} / {totalPages}
      </span>
      <button
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 enabled:hover:bg-zinc-50 disabled:opacity-40"
        onClick={onNext}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        ▶
      </button>
    </div>
  );
}

function TopBar({
  childrenLeft,
  childrenRight,
}: {
  childrenLeft?: React.ReactNode;
  childrenRight?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-gradient-to-b from-white to-zinc-50 px-3 py-2">
      <div className="flex items-center gap-2">{childrenLeft}</div>
      <div className="flex items-center gap-2">{childrenRight}</div>
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Search..."}
      className="h-8 w-[220px] rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300"
      aria-label="Search"
    />
  );
}

/** 검색 범위 선택 — Atom 테이블용 */
type AtomSearchScope = "ALL" | "ATOM" | "TYPE" | "DISTANCE";
function AtomSearchScopeSelect({
  value,
  onChange,
}: {
  value: AtomSearchScope;
  onChange: (v: AtomSearchScope) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as AtomSearchScope)}
      className="h-8 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900"
      aria-label="Search scope"
      title="Search scope"
    >
      <option value="ALL">All</option>
      <option value="ATOM">Atom</option>
      <option value="TYPE">Interaction Type</option>
      <option value="DISTANCE">Distance</option>
    </select>
  );
}

/** 검색 범위 선택 — Residue 테이블용 */
type ResidueSearchScope = "ALL" | "RESIDUE" | "TYPE";
function ResidueSearchScopeSelect({
  value,
  onChange,
}: {
  value: ResidueSearchScope;
  onChange: (v: ResidueSearchScope) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ResidueSearchScope)}
      className="h-8 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900"
      aria-label="Search scope"
      title="Search scope"
    >
      <option value="ALL">All</option>
      <option value="RESIDUE">Residue</option>
      <option value="TYPE">Interaction Type</option>
    </select>
  );
}

function CSVButton({
  filenameBase,
  rows,
  headers,
  pdbId,
}: {
  filenameBase: string;
  rows: Array<Record<string, string | number>>;
  headers: string[];
  pdbId: string;
}) {
  const onClick = React.useCallback(() => {
    const filename = `${pdbId}_${filenameBase}_${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.csv`;
    const csv = toCSV(rows, headers);
    downloadTextFile(filename, csv);
  }, [rows, headers, filenameBase, pdbId]);
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 hover:bg-zinc-50"
      aria-label="Download CSV"
      title="Download CSV"
    >
      Download CSV
    </button>
  );
}

/* ===== TypePill uses resolver from parent to stay in sync with filter colors ===== */
export function TypePill({
  type,
  resolveTypeColor,
}: {
  type: string;
  resolveTypeColor: (t: string) => TypeColor | null;
}) {
  const c = resolveTypeColor(type);
  if (!c) {
    return (
      <span className="inline-flex items-center rounded-full border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-900">
        {type}
      </span>
    );
  }
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1",
        c.bg,
        c.text,
        c.ring,
      ].join(" ")}
    >
      {type}
    </span>
  );
}

/* ===== High-level tables ===== */
export function AtomTable({
  rows,
  pageSizeState,
  pdbId,
  resolveTypeColor,
}: {
  rows: AtomRow[];
  pageSizeState?: PageSize;
  pdbId: string;
  resolveTypeColor: (t: string) => TypeColor | null;
}) {
  const [q, setQ] = React.useState<string>("");
  const [scope, setScope] = React.useState<AtomSearchScope>("ALL");

  // 검색/범위 반영
  const filtered = React.useMemo(() => {
    const qLower = q.trim().toLowerCase();
    if (qLower.length === 0) return rows;

    return rows.filter((r) => {
      const atomHay = `${r.Atom1} ${r.Atom2}`.toLowerCase();
      const typeHay = r["Interaction Type"].toLowerCase();
      const distHay = String(r["Distance(Å)"]).toLowerCase();

      switch (scope) {
        case "ALL":
          return (
            atomHay.includes(qLower) ||
            typeHay.includes(qLower) ||
            distHay.includes(qLower) ||
            String(r["Angle(°)"]).toLowerCase().includes(qLower)
          );
        case "ATOM":
          return atomHay.includes(qLower);
        case "TYPE":
          return typeHay.includes(qLower);
        case "DISTANCE":
          return distHay.includes(qLower);
      }
    });
  }, [rows, q, scope]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    start,
    end,
    pageRows,
    totalCount,
  } = usePagination<AtomRow>(filtered, pageSizeState ?? 10);

  // CSV (괄호 텍스트 제외한 헤더)
  const csvHeaders = React.useMemo(
    () => ["Atom1", "Atom2", "Interaction Type", "Distance", "Angle"],
    []
  );
  const csvRows = React.useMemo(
    () =>
      filtered.map((r) => ({
        Atom1: r.Atom1,
        Atom2: r.Atom2,
        "Interaction Type": r["Interaction Type"],
        Distance: r["Distance(Å)"],
        Angle: r["Angle(°)"],
      })),
    [filtered]
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <TopBar
        childrenLeft={
          <>
            <AtomSearchScopeSelect
              value={scope}
              onChange={(v) => {
                setPage(1);
                setScope(v);
              }}
            />
            <SearchBox
              value={q}
              onChange={(v) => {
                setPage(1);
                setQ(v);
              }}
              placeholder="Type to search…"
            />
          </>
        }
        childrenRight={
          <>
            <CSVButton
              filenameBase="atom"
              rows={csvRows}
              headers={csvHeaders}
              pdbId={pdbId}
            />
            <span className="text-xs text-zinc-900 tabular-nums">
              {totalCount ? `${start + 1}-${end} of ${totalCount}` : "0 of 0"}
            </span>
            <PageSizeSelect value={pageSize} onChange={setPageSize} />
            <Pager
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage(Math.max(1, page - 1))}
              onNext={() => setPage(Math.min(totalPages, page + 1))}
            />
          </>
        }
      />
      <div className="max-h-[55vh] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur">
            <tr className="border-b">
              <Th>
                Atom1
                <SubLabel text="(Chain / Res No. / Res Name / Atom / Serial)" />
              </Th>
              <Th>
                Atom2
                <SubLabel text="(Chain / Res No. / Res Name / Atom / Serial)" />
              </Th>
              <Th>Interaction Type</Th>
              <Th className="text-right">Distance(Å)</Th>
              <Th className="text-right">Angle(°)</Th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => (
              <tr
                key={`${r.Atom1}-${r.Atom2}-${i}`}
                className="group border-b last:border-b-0 hover:bg-zinc-50/60"
              >
                <Td>{r.Atom1}</Td>
                <Td>{r.Atom2}</Td>
                <Td>
                  <TypePill
                    type={r["Interaction Type"]}
                    resolveTypeColor={resolveTypeColor}
                  />
                </Td>
                <Td align="right" mono>
                  {r["Distance(Å)"]}
                </Td>
                <Td align="right" mono>
                  {r["Angle(°)"]}
                </Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-zinc-900" colSpan={5}>
                  데이터 없음
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ResidueTable({
  rows,
  pageSizeState,
  pdbId,
  resolveTypeColor,
}: {
  rows: ResidueRow[];
  pageSizeState?: PageSize;
  pdbId: string;
  resolveTypeColor: (t: string) => TypeColor | null;
}) {
  const [q, setQ] = React.useState<string>("");
  const [scope, setScope] = React.useState<ResidueSearchScope>("ALL");

  const filtered = React.useMemo(() => {
    const qLower = q.trim().toLowerCase();
    if (qLower.length === 0) return rows;

    return rows.filter((r) => {
      const residueHay = `${r.Atom1} ${r.Atom2}`.toLowerCase();
      const typeHay = r["Interaction Type"].toLowerCase();

      switch (scope) {
        case "ALL":
          return (
            residueHay.includes(qLower) ||
            typeHay.includes(qLower) ||
            String(r.Count).toLowerCase().includes(qLower)
          );
        case "RESIDUE":
          return residueHay.includes(qLower);
        case "TYPE":
          return typeHay.includes(qLower);
      }
    });
  }, [rows, q, scope]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    start,
    end,
    pageRows,
    totalCount,
  } = usePagination<ResidueRow>(filtered, pageSizeState ?? 10);

  // CSV (괄호 텍스트 제외 + Residue1/2로 헤더 변경)
  const csvHeaders = React.useMemo(
    () => ["Count", "Residue1", "Residue2", "Interaction Type"],
    []
  );
  const csvRows = React.useMemo(
    () =>
      filtered.map((r) => ({
        Count: r.Count,
        Residue1: r.Atom1,
        Residue2: r.Atom2,
        "Interaction Type": r["Interaction Type"],
      })),
    [filtered]
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <TopBar
        childrenLeft={
          <>
            <ResidueSearchScopeSelect
              value={scope}
              onChange={(v) => {
                setPage(1);
                setScope(v);
              }}
            />
            <SearchBox
              value={q}
              onChange={(v) => {
                setPage(1);
                setQ(v);
              }}
              placeholder="Type to search…"
            />
          </>
        }
        childrenRight={
          <>
            <CSVButton
              filenameBase="residue"
              rows={csvRows}
              headers={csvHeaders}
              pdbId={pdbId}
            />
            <span className="text-xs text-zinc-900 tabular-nums">
              {totalCount ? `${start + 1}-${end} of ${totalCount}` : "0 of 0"}
            </span>
            <PageSizeSelect value={pageSize} onChange={setPageSize} />
            <Pager
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage(Math.max(1, page - 1))}
              onNext={() => setPage(Math.min(totalPages, page + 1))}
            />
          </>
        }
      />
      <div className="max-h-[55vh] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur">
            <tr className="border-b">
              <Th className="w-[90px]">Count</Th>
              <Th>
                Residue1
                <SubLabel text="(Chain / Res No. / Res Name)" />
              </Th>
              <Th>
                Residue2
                <SubLabel text="(Chain / Res No. / Res Name)" />
              </Th>
              <Th>Interaction Type</Th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => (
              <tr
                key={`${r.Atom1}-${r.Atom2}-${i}`}
                className="group border-b last:border-b-0 hover:bg-zinc-50/60"
              >
                <Td mono>{r.Count}</Td>
                <Td>{r.Atom1}</Td>
                <Td>{r.Atom2}</Td>
                <Td>
                  <TypePill
                    type={r["Interaction Type"]}
                    resolveTypeColor={resolveTypeColor}
                  />
                </Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-zinc-900" colSpan={4}>
                  데이터 없음
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===== Facade ===== */
export function TablePane({
  mode,
  atomRows,
  residueRows,
  pdbId,
  resolveTypeColor,
}: {
  mode: Mode;
  atomRows: AtomRow[];
  residueRows: ResidueRow[];
  pdbId: string;
  resolveTypeColor: (t: string) => TypeColor | null;
}) {
  return (
    <section className="rounded-2xl  bg-white">
      {mode === "atom" ? (
        <AtomTable
          rows={atomRows}
          pdbId={pdbId}
          resolveTypeColor={resolveTypeColor}
        />
      ) : (
        <ResidueTable
          rows={residueRows}
          pdbId={pdbId}
          resolveTypeColor={resolveTypeColor}
        />
      )}
    </section>
  );
}
