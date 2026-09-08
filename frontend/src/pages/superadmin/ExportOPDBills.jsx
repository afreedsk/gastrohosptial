import { useState } from "react";
import api from "../../api/axios";

export default function ExportOPDBills() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [downloading, setDownloading] = useState(false);

  const handleExport = async () => {
    setDownloading(true);
    try {
      const res = await api.get("/superadmin/export/op-bills", {
        params: { from, to },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "op_bills_export.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Export failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ maxWidth: 550 }}>
      <label>From: <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
      <label style={{ marginLeft: 10 }}>To: <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      <button onClick={handleExport} disabled={downloading} style={{ marginLeft: 10 }}>
        {downloading ? "Exporting..." : "Export to Excel"}
      </button>
    </div>
  );
}