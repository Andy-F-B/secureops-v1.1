import { useState } from "react";
import { uploadFile, getSignedUrl } from "@/api/supabaseClient";
import { File, CheckCircle, Trash2 } from "lucide-react";

const DOC_TYPES = [
  { id: "id_front", label: "Government ID (Front)" },
  { id: "id_back", label: "Government ID (Back)" },
  { id: "guard_card", label: "Guard Card" },
  { id: "resume", label: "Resume / CV" },
  { id: "certifications", label: "Certifications" },
  { id: "other", label: "Other Document" },
];

// candidateId is required to namespace files per candidate
export default function DocumentUploader({ record, candidateId, onUpdate }) {
  const [uploading, setUploading] = useState({});
  const [docs, setDocs] = useState(record?.documents_uploaded || []);

  const handleUpload = async (docType, file) => {
    setUploading(u => ({ ...u, [docType]: true }));
    const ext = file.name.split(".").pop();
    const path = `${candidateId}/${docType}_${Date.now()}.${ext}`;
    const storagePath = await uploadFile("onboarding-docs", file, path);
    const newDoc = {
      type: docType,
      label: DOC_TYPES.find(d => d.id === docType)?.label,
      storage_path: storagePath,
      file_name: file.name,
      uploaded_at: new Date().toISOString(),
    };
    const updated = [...docs.filter(d => d.type !== docType), newDoc];
    setDocs(updated);
    await onUpdate({ documents_uploaded: updated });
    setUploading(u => ({ ...u, [docType]: false }));
  };

  const handleView = async (doc) => {
    const url = await getSignedUrl("onboarding-docs", doc.storage_path);
    window.open(url, "_blank");
  };

  const removeDoc = async (docType) => {
    const updated = docs.filter(d => d.type !== docType);
    setDocs(updated);
    await onUpdate({ documents_uploaded: updated });
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">Upload required documents below. Each document type can have one file.</p>
      <div className="grid grid-cols-1 gap-3">
        {DOC_TYPES.map(dt => {
          const existing = docs.find(d => d.type === dt.id);
          const isUploading = uploading[dt.id];
          return (
            <div key={dt.id} className={`flex items-center justify-between p-4 rounded-xl border ${existing ? "border-green-800/50 bg-green-900/10" : "border-gray-700 bg-gray-800/50"}`}>
              <div className="flex items-center gap-3">
                {existing ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" /> : <File className="w-5 h-5 text-gray-500 flex-shrink-0" />}
                <div>
                  <p className="text-white text-sm font-medium">{dt.label}</p>
                  {existing && (
                    <button onClick={() => handleView(existing)} className="text-gray-500 text-xs hover:text-blue-400 truncate max-w-[180px] text-left">
                      {existing.file_name} ↗
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {existing && (
                  <button onClick={() => removeDoc(dt.id)} className="text-gray-500 hover:text-red-400 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <label className={`cursor-pointer text-xs px-3 py-1.5 rounded-lg border transition-colors ${existing ? "border-gray-600 text-gray-400 hover:text-white hover:border-gray-400" : "border-purple-600 text-purple-400 hover:bg-purple-900/30"}`}>
                  {isUploading ? "Uploading..." : existing ? "Replace" : "Upload"}
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" disabled={isUploading}
                    onChange={e => e.target.files[0] && handleUpload(dt.id, e.target.files[0])} />
                </label>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-gray-600 text-xs">Accepted: PDF, JPG, PNG, DOC, DOCX</p>
    </div>
  );
}
