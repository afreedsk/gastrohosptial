import { useState } from "react";
import ImportBills from "./ImportOPDBills";
import ExportOPDBills from "./ExportOPDBills";

const TABS = [
  { key: "opd", label: "Import OPD Bills" },
  { key: "lab", label: "Import Lab Bills" },
  { key: "radiology", label: "Import Radiology Bills" },
  { key: "export", label: "Export OPD Bills" },
];

export default function BulkImport() {
  const [tab, setTab] = useState("opd");

  return (
    <div style={{ padding: 24 }}>
      <h2>Bulk Data Management</h2>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, borderBottom: "1px solid #ddd" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 16px", border: "none", cursor: "pointer", background: "none",
              borderBottom: tab === t.key ? "2px solid #2563eb" : "2px solid transparent",
              fontWeight: tab === t.key ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "opd" && <ImportBills importType="opd_bills" label="Import OPD consultation billing CSV/Excel" />}
      {tab === "lab" && <ImportBills importType="lab_bills" label="Import Lab investigation billing CSV/Excel" />}
      {tab === "radiology" && <ImportBills importType="radiology_bills" label="Import Radiology investigation billing CSV/Excel" />}
      {tab === "export" && <ExportOPDBills />}
    </div>
  );
}