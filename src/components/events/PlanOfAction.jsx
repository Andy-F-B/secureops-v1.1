import { useState } from "react";
import { X, Plus, Trash2, Download, FileText, ChevronDown, ChevronUp } from "lucide-react";
import jsPDF from "jspdf";

const emptyPOA = {
  event_title: "",
  event_description: "",
  event_date: "",
  client_name: "",
  client_contact: "",
  leadership_mod: "",
  uniform_list: [""],
  equipment_list: [""],
  event_location: "",
  duties: [""],
  policies: [""],
};

export default function PlanOfAction({ event, existingPOA, onSave }) {
  const [showForm, setShowForm] = useState(false);
  const [showPOA, setShowPOA] = useState(false);
  const [poa, setPOA] = useState(existingPOA || null);
  const [form, setForm] = useState({
    ...emptyPOA,
    event_title: event?.name || "",
    event_date: event?.start_date || "",
    client_name: event?.client_name || "",
    event_location: event?.site_name || "",
    ...(existingPOA || {}),
  });

  const setField = (key, val) => setPOA ? setForm(f => ({ ...f, [key]: val })) : null;

  const addItem = (key) => setForm(f => ({ ...f, [key]: [...(f[key] || []), ""] }));
  const removeItem = (key, idx) => setForm(f => ({ ...f, [key]: f[key].filter((_, i) => i !== idx) }));
  const updateItem = (key, idx, val) => setForm(f => ({ ...f, [key]: f[key].map((v, i) => i === idx ? val : v) }));

  const handleSubmit = () => {
    setPOA(form);
    onSave(form);
    setShowForm(false);
    setShowPOA(true);
  };

  const downloadPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const margin = 50;
    let y = margin;
    const pageW = doc.internal.pageSize.getWidth();
    const lineH = 18;

    const addLine = (text, opts = {}) => {
      if (y > 720) { doc.addPage(); y = margin; }
      if (opts.bold) doc.setFont("helvetica", "bold");
      else doc.setFont("helvetica", "normal");
      doc.setFontSize(opts.size || 11);
      const lines = doc.splitTextToSize(text, pageW - margin * 2);
      doc.text(lines, margin, y);
      y += lineH * lines.length + (opts.after || 0);
    };

    const section = (title) => {
      y += 8;
      doc.setFillColor(30, 41, 59);
      doc.rect(margin, y - 13, pageW - margin * 2, 20, "F");
      doc.setTextColor(255, 255, 255);
      addLine(title, { bold: true, size: 12 });
      doc.setTextColor(30, 41, 59);
      y += 4;
    };

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 80, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("PLAN OF ACTION", margin, 38);
    doc.setFontSize(13);
    doc.setFont("helvetica", "normal");
    doc.text(`${poa.event_title || event?.name}`, margin, 58);
    doc.setTextColor(30, 41, 59);
    y = 100;

    section("1. EVENT INFORMATION");
    addLine(`Event Title: ${poa.event_title || "—"}`);
    addLine(`Event Description: ${poa.event_description || "—"}`);
    addLine(`Event Date: ${poa.event_date || "—"}`, { after: 4 });

    section("2. CLIENT INFORMATION");
    addLine(`Client Name: ${poa.client_name || "—"}`);
    addLine(`Client Contact: ${poa.client_contact || "—"}`, { after: 4 });

    section("3. LEADERSHIP");
    addLine(`Macforce Leadership / MOD: ${poa.leadership_mod || "—"}`, { after: 4 });

    section("4. UNIFORM & EQUIPMENT REQUIREMENTS");
    addLine("Uniform:", { bold: true });
    (poa.uniform_list || []).filter(Boolean).forEach((u, i) => addLine(`  ${i + 1}. ${u}`));
    y += 6;
    addLine("Equipment:", { bold: true });
    (poa.equipment_list || []).filter(Boolean).forEach((e, i) => addLine(`  ${i + 1}. ${e}`));
    y += 4;

    section("5. LOCATION");
    addLine(`Event Location: ${poa.event_location || "—"}`, { after: 4 });

    section("6. EVENT DUTIES & POLICIES");
    addLine("Duties:", { bold: true });
    (poa.duties || []).filter(Boolean).forEach((d, i) => addLine(`  ${i + 1}. ${d}`));
    y += 6;
    addLine("Policies:", { bold: true });
    (poa.policies || []).filter(Boolean).forEach((p, i) => addLine(`  ${i + 1}. ${p}`));

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150);
      doc.text(`SecureOps — Confidential | Page ${i} of ${pageCount}`, margin, 760);
    }

    doc.save(`POA - ${poa.event_title || event?.name}.pdf`);
  };

  return (
    <div>
      {!poa ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium"
        >
          <FileText className="w-4 h-4" /> Create Plan of Action
        </button>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="text-white font-medium text-sm">Plan of Action — {poa.event_title || event?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={downloadPDF} className="flex items-center gap-1.5 text-xs bg-green-900/40 text-green-400 hover:bg-green-900/60 px-3 py-1.5 rounded-lg border border-green-800/50">
                <Download className="w-3 h-3" /> Download PDF
              </button>
              <button onClick={() => setShowPOA(v => !v)} className="text-gray-400 hover:text-white">
                {showPOA ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button onClick={() => setShowForm(true)} className="text-xs text-blue-400 hover:underline">Edit</button>
            </div>
          </div>

          {showPOA && (
            <div className="mt-4 space-y-4 text-sm text-gray-300">
              <POASection title="1. Event Information">
                <POARow label="Event Title" value={poa.event_title} />
                <POARow label="Description" value={poa.event_description} />
                <POARow label="Date" value={poa.event_date} />
              </POASection>
              <POASection title="2. Client Information">
                <POARow label="Client Name" value={poa.client_name} />
                <POARow label="Client Contact" value={poa.client_contact} />
              </POASection>
              <POASection title="3. Leadership">
                <POARow label="MOD / Leadership" value={poa.leadership_mod} />
              </POASection>
              <POASection title="4. Uniform & Equipment">
                <div className="mb-2">
                  <p className="text-gray-400 text-xs font-semibold uppercase mb-1">Uniform</p>
                  {(poa.uniform_list || []).filter(Boolean).map((u, i) => <p key={i} className="ml-2">• {u}</p>)}
                </div>
                <div>
                  <p className="text-gray-400 text-xs font-semibold uppercase mb-1">Equipment</p>
                  {(poa.equipment_list || []).filter(Boolean).map((e, i) => <p key={i} className="ml-2">• {e}</p>)}
                </div>
              </POASection>
              <POASection title="5. Location">
                <POARow label="Location" value={poa.event_location} />
              </POASection>
              <POASection title="6. Duties & Policies">
                <div className="mb-2">
                  <p className="text-gray-400 text-xs font-semibold uppercase mb-1">Duties</p>
                  {(poa.duties || []).filter(Boolean).map((d, i) => <p key={i} className="ml-2">• {d}</p>)}
                </div>
                <div>
                  <p className="text-gray-400 text-xs font-semibold uppercase mb-1">Policies</p>
                  {(poa.policies || []).filter(Boolean).map((p, i) => <p key={i} className="ml-2">• {p}</p>)}
                </div>
              </POASection>
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <h3 className="text-white font-bold">PLAN OF ACTION — CATEGORY LIST</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-6">

              {/* 1. Event Info */}
              <FormSection number="1" title="Event Information">
                <FormField label="Event Title" value={form.event_title} onChange={v => setForm(f => ({ ...f, event_title: v }))} />
                <FormField label="Event Description" value={form.event_description} onChange={v => setForm(f => ({ ...f, event_description: v }))} textarea />
                <FormField label="Event Date" value={form.event_date} onChange={v => setForm(f => ({ ...f, event_date: v }))} type="date" />
              </FormSection>

              {/* 2. Client */}
              <FormSection number="2" title="Client Information">
                <FormField label="Client Name" value={form.client_name} onChange={v => setForm(f => ({ ...f, client_name: v }))} />
                <FormField label="Client Contact" value={form.client_contact} onChange={v => setForm(f => ({ ...f, client_contact: v }))} />
              </FormSection>

              {/* 3. Leadership */}
              <FormSection number="3" title="Leadership">
                <FormField label="Macforce Leadership / MOD" value={form.leadership_mod} onChange={v => setForm(f => ({ ...f, leadership_mod: v }))} />
              </FormSection>

              {/* 4. Uniform & Equipment */}
              <FormSection number="4" title="Uniform & Equipment Requirements">
                <ListField label="Uniform List" items={form.uniform_list} onAdd={() => addItem("uniform_list")} onRemove={i => removeItem("uniform_list", i)} onChange={(i, v) => updateItem("uniform_list", i, v)} />
                <ListField label="Equipment List" items={form.equipment_list} onAdd={() => addItem("equipment_list")} onRemove={i => removeItem("equipment_list", i)} onChange={(i, v) => updateItem("equipment_list", i, v)} />
              </FormSection>

              {/* 5. Location */}
              <FormSection number="5" title="Location">
                <FormField label="Event Location" value={form.event_location} onChange={v => setForm(f => ({ ...f, event_location: v }))} />
              </FormSection>

              {/* 6. Duties & Policies */}
              <FormSection number="6" title="Event Duties & Policies">
                <ListField label="Duty Item (List)" items={form.duties} onAdd={() => addItem("duties")} onRemove={i => removeItem("duties", i)} onChange={(i, v) => updateItem("duties", i, v)} />
                <ListField label="Policy Item (List)" items={form.policies} onAdd={() => addItem("policies")} onRemove={i => removeItem("policies", i)} onChange={(i, v) => updateItem("policies", i, v)} />
              </FormSection>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-800 sticky bottom-0 bg-gray-900">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm">Cancel</button>
              <button onClick={handleSubmit} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">Submit POA</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormSection({ number, title, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">{number}</span>
        <h4 className="text-white font-semibold">{title}</h4>
      </div>
      <div className="space-y-3 pl-8">{children}</div>
    </div>
  );
}

function FormField({ label, value, onChange, type = "text", textarea }) {
  return (
    <div>
      <label className="text-gray-400 text-xs block mb-1">{label}</label>
      {textarea ? (
        <textarea value={value || ""} onChange={e => onChange(e.target.value)} rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
      ) : (
        <input type={type} value={value || ""} onChange={e => onChange(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
      )}
    </div>
  );
}

function ListField({ label, items, onAdd, onRemove, onChange }) {
  return (
    <div>
      <label className="text-gray-400 text-xs block mb-2">{label}</label>
      <div className="space-y-2">
        {(items || []).map((item, i) => (
          <div key={i} className="flex gap-2">
            <input value={item} onChange={e => onChange(i, e.target.value)} placeholder={`Item ${i + 1}`}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            <button onClick={() => onRemove(i)} className="text-gray-500 hover:text-red-400">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button onClick={onAdd} className="flex items-center gap-1 text-blue-400 text-xs hover:underline">
          <Plus className="w-3 h-3" /> Add item
        </button>
      </div>
    </div>
  );
}

function POASection({ title, children }) {
  return (
    <div>
      <p className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-2 border-b border-gray-700 pb-1">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function POARow({ label, value }) {
  return (
    <p><span className="text-gray-400">{label}: </span><span className="text-white">{value || "—"}</span></p>
  );
}