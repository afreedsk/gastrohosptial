import { useState } from "react";
import ImportOPDBills from "./ImportOPDBills";
import ExportOPDBills from "./ExportOPDBills";

export default function BulkImport() {
  const [tab, setTab] = useState("import");

  return (
    <div style={{ padding: 24 }}>
      <h2>Bulk Data Management</h2>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, borderBottom: "1px solid #ddd" }}>
        <button
          onClick={() => setTab("import")}
          style={{
            padding: "8px 16px", border: "none", cursor: "pointer",
            borderBottom: tab === "import" ? "2px solid #2563eb" : "2px solid transparent",
            fontWeight: tab === "import" ? 600 : 400, background: "none",
          }}
        >
          Import OPD Bills
        </button>
        <button
          onClick={() => setTab("export")}
          style={{
            padding: "8px 16px", border: "none", cursor: "pointer",
            borderBottom: tab === "export" ? "2px solid #2563eb" : "2px solid transparent",
            fontWeight: tab === "export" ? 600 : 400, background: "none",
          }}
        >
          Export OPD Bills
        </button>
      </div>

      {tab === "import" ? <ImportOPDBills /> : <ExportOPDBills />}
    </div>
  );
}