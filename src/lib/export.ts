/** Exportação de tabelas do painel em CSV e PDF (via impressão do navegador). */

export type ExportColumn<T> = { header: string; value: (row: T) => string | number };

function escapeCsv(value: string | number) {
  const s = String(value ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsv<T>(filename: string, columns: ExportColumn<T>[], rows: T[]) {
  const lines = [
    columns.map((c) => escapeCsv(c.header)).join(";"),
    ...rows.map((r) => columns.map((c) => escapeCsv(c.value(r))).join(";")),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([`\ufeff${lines}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const escapeHtml = (v: unknown) =>
  String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function downloadPdf<T>(
  title: string,
  columns: ExportColumn<T>[],
  rows: T[],
  options?: { subtitle?: string; summary?: { label: string; value: string }[] },
) {
  const win = window.open("", "_blank", "width=1024,height=768");
  if (!win) return false;

  const summary = (options?.summary ?? [])
    .map((s) => `<div class="kpi"><span>${escapeHtml(s.label)}</span><strong>${escapeHtml(s.value)}</strong></div>`)
    .join("");

  win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:ui-sans-serif,system-ui,sans-serif;color:#111;margin:32px}
  h1{font-size:20px;margin:0 0 4px}
  p.sub{margin:0 0 20px;color:#666;font-size:12px}
  .kpis{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:20px}
  .kpi{border:1px solid #e2e2e8;border-radius:10px;padding:10px 14px;min-width:150px}
  .kpi span{display:block;font-size:10px;text-transform:uppercase;color:#777;letter-spacing:.05em}
  .kpi strong{font-size:16px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th,td{border-bottom:1px solid #e6e6ec;padding:7px 8px;text-align:left}
  th{background:#f6f6fa;text-transform:uppercase;font-size:9px;letter-spacing:.05em;color:#555}
  td:not(:first-child),th:not(:first-child){text-align:right}
  footer{margin-top:22px;font-size:10px;color:#888}
</style></head><body>
<h1>${escapeHtml(title)}</h1>
<p class="sub">${escapeHtml(options?.subtitle ?? "")} · gerado em ${new Date().toLocaleString("pt-BR")}</p>
${summary ? `<div class="kpis">${summary}</div>` : ""}
<table><thead><tr>${columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join("")}</tr></thead>
<tbody>${rows
    .map((r) => `<tr>${columns.map((c) => `<td>${escapeHtml(c.value(r))}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>
<footer>Nexus ERP · relatório gerado pela plataforma</footer>
</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
  return true;
}
