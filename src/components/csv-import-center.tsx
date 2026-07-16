"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { ArrowLeft, CheckCircle2, FileSpreadsheet, LoaderCircle, ShieldAlert, Upload } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import BrandSettings from "@/components/brand-settings";

type CsvRow = Record<string, string>;
type FileState = { name: string; text: string; rows: CsvRow[]; fields: string[]; errors: string[] } | null;

async function readCsv(file: File): Promise<FileState> {
  const text = await file.text();
  const parsed = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: "greedy", transformHeader: (header) => header.trim() });
  return {
    name: file.name,
    text,
    rows: parsed.data,
    fields: parsed.meta.fields ?? [],
    errors: parsed.errors.map((error) => `Row ${error.row ?? "?"}: ${error.message}`),
  };
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function customerPayload(row: CsvRow) {
  return { id: row.id || null, email: row.email?.trim().toLowerCase() || null, company: row.company || null, first_name: row.firstname || null, last_name: row.lastname || null };
}

function orderPayload(row: CsvRow) {
  return {
    external_order_number: row["Order Number"] || null,
    account_id: null,
    site_id: row["Site Id"] || null,
    site_name: row["Site Name"] || null,
    order_type: row["Order Type"] || null,
    status: row.Status || null,
    ordered_at: row["Date Ordered"] || null,
    amount_billed: row["Amount Billed"] || "0",
    tax_total: row["Tax:Virginia Sales Tax"] || row["Tax Total"] || "0",
    shipping_total: row["Shipping Total"] || "0",
    rush_order_cost: row["Rush Order Cost"] || "0",
    coupon_discount: row["Coupon Discount"] || "0",
    final_discount: row["Final Discount"] || "0",
    billing_email: row["Billing Email Address"]?.trim().toLowerCase() || null,
    billing_company: row["Billing Company"] || null,
  };
}

export default function CsvImportCenter() {
  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const [access, setAccess] = useState<"checking" | "allowed" | "denied">(
    isSupabaseConfigured ? "checking" : "denied",
  );
  const [customers, setCustomers] = useState<FileState>(null);
  const [orders, setOrders] = useState<FileState>(null);
  const [busy, setBusy] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setAccess("denied"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      setAccess(profile?.role === "staff" || profile?.role === "admin" ? "allowed" : "denied");
    });
  }, [isSupabaseConfigured]);

  const preview = useMemo(() => ({
    customers: customers?.rows.length ?? 0,
    orders: orders?.rows.length ?? 0,
    parseErrors: (customers?.errors.length ?? 0) + (orders?.errors.length ?? 0),
    blanksOrders: orders?.rows.filter((row) => row["Site Id"] === "27457826" || row["Site Name"]?.trim().toLowerCase() === "onward blanks").length ?? 0,
    paidOrders: orders?.rows.filter((row) => row.Status?.trim().toLowerCase() === "paid in full").length ?? 0,
    unresolvedOrders: orders?.rows.length ?? 0,
  }), [customers, orders]);

  async function chooseFile(event: ChangeEvent<HTMLInputElement>, type: "customers" | "orders") {
    const file = event.target.files?.[0];
    if (!file) return;
    const result = await readCsv(file);
    if (type === "customers") setCustomers(result); else setOrders(result);
    setRunId(null); setMessage(null); setError(null);
  }

  async function stageImport() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || (!customers && !orders)) return;
    setBusy(true); setError(null); setMessage(null);
    const combined = `${customers?.text ?? ""}\n---ORDERS---\n${orders?.text ?? ""}`;
    const hash = await sha256(combined);
    const { data, error: stageError } = await supabase.rpc("stage_deco_import", {
      p_file_name: [customers?.name, orders?.name].filter(Boolean).join(" + "),
      p_file_sha256: hash,
      p_customer_rows: customers?.rows.map(customerPayload) ?? [],
      p_order_rows: orders?.rows.map(orderPayload) ?? [],
    });
    setBusy(false);
    if (stageError) { setError(stageError.message); return; }
    setRunId(String(data));
    setMessage("Dry run staged. No order was approved or added to qualifying spend.");
  }

  if (access === "checking") return <main className="import-page"><LoaderCircle className="auth-spinner" /> Checking staff access…</main>;
  if (access === "denied") return <main className="import-page"><section className="import-panel"><ShieldAlert size={34} /><h1>Staff access required</h1><p>This route is protected by Supabase role checks and database policies.</p><Link href="/"><ArrowLeft size={16} /> Return to dashboard</Link></section></main>;

  return (
    <main className="import-page">
      <section className="import-shell">
        <Link className="import-back" href="/"><ArrowLeft size={16} /> Customer dashboard</Link>
        <span className="auth-eyebrow"><FileSpreadsheet size={15} /> Deco CSV Import Center</span>
        <h1>Validate before anything counts.</h1>
        <p className="import-intro">Development proof only. Use anonymized exports. Files are parsed locally, then validated staging rows are protected by staff-only RLS.</p>
        <BrandSettings />
        <div className="import-warning"><ShieldAlert size={19} /><strong>Real customer files are not approved for import yet.</strong></div>

        <div className="upload-grid">
          <label className="upload-card"><Upload size={23} /><strong>Customer CSV</strong><span>{customers ? `${customers.name} · ${customers.rows.length} rows` : "Choose customers.csv"}</span><input type="file" accept=".csv,text/csv" onChange={(event) => void chooseFile(event, "customers")} /></label>
          <label className="upload-card"><Upload size={23} /><strong>Order CSV</strong><span>{orders ? `${orders.name} · ${orders.rows.length} rows` : "Choose order_export.csv"}</span><input type="file" accept=".csv,text/csv" onChange={(event) => void chooseFile(event, "orders")} /></label>
        </div>

        <div className="preview-grid">
          <div><span>Customers</span><strong>{preview.customers}</strong></div><div><span>Orders</span><strong>{preview.orders}</strong></div><div><span>Paid in full</span><strong>{preview.paidOrders}</strong></div><div><span>Onward Blanks</span><strong>{preview.blanksOrders}</strong></div><div><span>Unresolved attribution</span><strong>{preview.unresolvedOrders}</strong></div><div><span>Parse errors</span><strong>{preview.parseErrors}</strong></div>
        </div>

        <button className="primary-button import-stage" disabled={busy || (!customers && !orders) || preview.parseErrors > 0} onClick={() => void stageImport()}>{busy ? <LoaderCircle className="auth-spinner" size={18} /> : <FileSpreadsheet size={18} />}{busy ? "Staging dry run…" : "Stage dry-run preview"}</button>
        {message ? <div className="auth-message auth-success"><CheckCircle2 size={18} />{message}</div> : null}
        {error ? <div className="auth-message auth-error" role="alert">{error}</div> : null}
        {runId ? <small className="run-id">Import run: {runId}</small> : null}
      </section>
    </main>
  );
}
