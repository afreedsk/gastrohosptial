import { useState, useRef, useEffect } from "react";
import api from "../../api/axios";

export default function ImportBills({ importType, label }) {
  const [file, setFile] = useState(null);
  const [batchId, setBatchId] = useState(null);
  const [status, setStatus] = useState(null);
  const [errorList, setErrorList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const pollRef = useRef(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("import_type", importType);

    try {
      const res = await api.post("/superadmin/import/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setBatchId(res.data.batch_id);
      setStatus(null);
      setErrorList([]);
    } catch (err) {
      alert(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!batchId) return;
    pollRef.current = setInterval(async () => {
      const res = await api.get(`/superadmin/import/status/${batchId}`);
      setStatus(res.data);
      if (res.data.status === "Completed" || res.data.status === "Failed") {
        clearInterval(pollRef.current);
        if (res.data.failed_rows > 0) {
          const errRes = await api.get(`/superadmin/import/errors/${batchId}`);
          setErrorList(errRes.data);
        }
      }
    }, 1500);
    return () => clearInterval(pollRef.current);
  }, [batchId]);

  const percent = status && status.total_rows
    ? Math.round((status.processed_rows / status.total_rows) * 100)
    : 0;

  return (
    <div style={{ maxWidth: 550 }}>
      <p style={{ fontWeight: 600, marginBottom: 8 }}>{label}</p>
      <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload} disabled={!file || uploading} style={{ marginLeft: 10 }}>
        {uploading ? "Uploading..." : "Upload & Import"}
      </button>

      {status && (
        <div style={{ marginTop: 20 }}>
          <p>Status: <b>{status.status}</b></p>
          <div style={{ background: "#eee", borderRadius: 6, height: 16 }}>
            <div style={{
              width: `${percent}%`, background: "#4caf50", height: "100%",
              borderRadius: 6, transition: "width 0.3s",
            }} />
          </div>
          <p>{status.processed_rows} / {status.total_rows} rows ({percent}%)</p>
          <p>Inserted: {status.inserted_rows} | Updated: {status.updated_rows} | Failed: {status.failed_rows}</p>
        </div>
      )}

      {errorList.length > 0 && (
        <div style={{ marginTop: 20, maxHeight: 250, overflowY: "auto", border: "1px solid #ccc", padding: 10 }}>
          <b>Errors ({errorList.length}):</b>
          <ul>
            {errorList.map((e, i) => <li key={i}>Row {e.row_no}: {e.error_message}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}