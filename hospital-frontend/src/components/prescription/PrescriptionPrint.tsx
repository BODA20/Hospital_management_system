import React from 'react';

export interface PrescriptionData {
  appointmentId: number;
  appointmentDate?: string;
  queueNumber?: number;
  doctorName: string;
  doctorSpecialization?: string;
  doctorDepartment?: string;
  patientName: string;
  patientPhone?: string;
  reasonForVisit?: string;
  diagnosis: string;
  treatmentPlan?: string;
  notes?: string;
  printedAt?: string;
}

interface Props {
  data: PrescriptionData;
  onClose: () => void;
}

/** Format any date string / ISO timestamp → "22 Sep 2026" */
const formatVisitDate = (raw?: string): string => {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return raw;
  }
};

export const PrescriptionPrint: React.FC<Props> = ({ data, onClose }) => {
  const now            = data.printedAt ? new Date(data.printedAt) : new Date();
  const printedDateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const printedTimeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const visitDateStr   = formatVisitDate(data.appointmentDate);

  const handlePrint = () => window.print();

  /** WhatsApp share link with full details & official online PDF download link */
  const handleWhatsApp = () => {
    if (!data.patientPhone) return;
    const phone = data.patientPhone.replace(/\D/g, '');
    const baseUrl = window.location.origin;
    const pdfUrl = `${baseUrl}/api/v1/prescriptions/${data.appointmentId}/pdf`;

    const rawMessage =
      `🏥 *CareOS — PulseCare Medical Center*\n` +
      `📋 *Prescription Rx #${String(data.appointmentId).padStart(5, '0')}*\n` +
      `👤 Patient: ${data.patientName}\n` +
      `🩺 Doctor: ${data.doctorName}${data.doctorSpecialization ? ` (${data.doctorSpecialization})` : ''}\n` +
      `📅 Visit Date: ${visitDateStr || printedDateStr}\n\n` +
      `*Diagnosis:* ${data.diagnosis}\n\n` +
      (data.treatmentPlan ? `*Rx / Treatment:* \n${data.treatmentPlan}\n\n` : '') +
      (data.notes ? `*Notes:* ${data.notes}\n\n` : '') +
      `📄 *Download Official Rx PDF:*\n${pdfUrl}\n\n` +
      `_This is an official computer-generated medical prescription._`;

    const msg = encodeURIComponent(rawMessage);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  return (
    <>
      {/* ── Scoped Print CSS for Browser Print Engine ── */}
      <style>{`
        @media print {
          /* Hide all screen components */
          body * {
            visibility: hidden !important;
          }

          /* Force prescription print root & children visible */
          #rx-print-root,
          #rx-print-root * {
            visibility: visible !important;
          }

          /* Hide no-print buttons and controls */
          .no-print,
          #rx-print-root .no-print,
          #rx-print-root .no-print * {
            display: none !important;
            visibility: hidden !important;
          }

          /* Position print root static/absolute at document origin */
          #rx-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
            z-index: 999999 !important;
          }

          /* Expand modal card for printing */
          #rx-print-root .rx-modal-card {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: none !important;
            height: auto !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          #rx-print-root .rx-scroll-area {
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
          }

          /* Force exact background colors, borders, and margins */
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          @page {
            size: A4;
            margin: 12mm 15mm;
          }
        }
      `}</style>

      {/* ── Full-screen overlay wrapper ── */}
      <div
        id="rx-print-root"
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* ── Modal card container ── */}
        <div className="rx-modal-card bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">

          {/* ━━ Sticky top action bar (no-print) ━━ */}
          <div className="no-print flex-shrink-0 flex items-center justify-between px-5 py-3 bg-slate-800 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-teal-500 flex items-center justify-center text-white font-black text-xs">C</div>
              <span className="text-sm font-bold text-white tracking-wide">Prescription Preview</span>
            </div>
            <div className="flex items-center gap-2">
              {/* WhatsApp button */}
              {data.patientPhone && (
                <button
                  onClick={handleWhatsApp}
                  title="Send via WhatsApp"
                  className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </button>
              )}
              {/* Print button */}
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
              >
                🖨 Print
              </button>
              {/* Done button */}
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 bg-slate-600 hover:bg-slate-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
              >
                ✓ Done
              </button>
              {/* Close X */}
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white text-xl leading-none ml-1"
                aria-label="Close"
              >✕</button>
            </div>
          </div>

          {/* ━━ Scrollable prescription content body ━━ */}
          <div className="rx-scroll-area overflow-y-auto flex-1">
            <div id="rx-print-area" className="p-8 font-sans text-slate-900 bg-white">

              {/* ── Prescription Header ── */}
              <div className="flex items-start justify-between border-b-2 border-teal-600 pb-5 mb-6 gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-teal-600 flex items-center justify-center text-white font-black text-base">
                      C
                    </div>
                    <span className="text-2xl font-black text-teal-700 tracking-tight leading-none">CareOS</span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold">Hospital Management System</p>
                  <p className="text-xs text-slate-400">PulseCare Medical Center</p>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="inline-block text-[9px] font-bold uppercase tracking-[0.18em] text-teal-600 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full mb-1.5">
                    Medical Prescription
                  </span>
                  <p className="text-base font-black text-slate-800">
                    Rx <span className="font-mono">#{String(data.appointmentId).padStart(5, '0')}</span>
                  </p>
                  {data.queueNumber != null && (
                    <p className="text-xs text-slate-500 font-semibold">Queue #{data.queueNumber}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">{printedDateStr} · {printedTimeStr}</p>
                </div>
              </div>

              {/* ── Doctor / Patient Cards ── */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-teal-50 rounded-xl p-3.5 border border-teal-100">
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-teal-600 mb-1.5">Attending Physician</p>
                  <p className="font-bold text-slate-900">{data.doctorName}</p>
                  {data.doctorSpecialization && <p className="text-xs text-slate-500 mt-0.5">{data.doctorSpecialization}</p>}
                  {data.doctorDepartment && <p className="text-xs text-slate-400">{data.doctorDepartment}</p>}
                </div>
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1.5">Patient</p>
                  <p className="font-bold text-slate-900">{data.patientName}</p>
                  {data.patientPhone && <p className="text-xs text-slate-500 mt-0.5">{data.patientPhone}</p>}
                  {visitDateStr && <p className="text-xs text-slate-400 mt-0.5">Visit: {visitDateStr}</p>}
                </div>
              </div>

              {/* ── Chief Complaint ── */}
              {data.reasonForVisit && (
                <div className="mb-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1.5">Chief Complaint</p>
                  <p className="text-sm text-slate-800 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">{data.reasonForVisit}</p>
                </div>
              )}

              {/* ── Diagnosis ── */}
              <div className="mb-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1.5">Primary Diagnosis</p>
                <p className="text-sm font-semibold text-slate-900 bg-amber-50 rounded-lg px-3 py-2.5 border border-amber-200">{data.diagnosis}</p>
              </div>

              {/* ── Rx / Treatment ── */}
              {data.treatmentPlan && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl font-black text-teal-700 leading-none">℞</span>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">Treatment Plan & Prescriptions</p>
                  </div>
                  <div className="bg-white border-l-4 border-teal-500 pl-4 pr-3 py-3 rounded-r-xl text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                    {data.treatmentPlan}
                  </div>
                </div>
              )}

              {/* ── Clinical Notes ── */}
              {data.notes && (
                <div className="mb-6">
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1.5">Clinical Notes / Follow-up</p>
                  <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 italic whitespace-pre-line">
                    {data.notes}
                  </p>
                </div>
              )}

              {/* ── Prescription Footer ── */}
              <div className="border-t border-slate-200 pt-4 flex items-end justify-between">
                <div>
                  <p className="text-[9px] text-slate-400 italic max-w-xs">
                    This prescription is computer-generated and valid only with the issuing physician's authority.
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">CareOS · PulseCare Medical Center</p>
                </div>
                <div className="text-right">
                  <div className="w-36 border-b border-slate-400 mb-1.5" />
                  <p className="text-[9px] text-slate-400">Doctor's Signature & Stamp</p>
                </div>
              </div>

            </div>
          </div>

          {/* ━━ Sticky bottom action bar (no-print) ━━ */}
          <div className="no-print flex-shrink-0 flex items-center justify-end gap-3 px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold px-5 py-2 rounded-xl transition-colors shadow-sm"
            >
              🖨 Print Prescription
            </button>
            {data.patientPhone && (
              <button
                onClick={handleWhatsApp}
                className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-bold px-5 py-2 rounded-xl transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Send via WhatsApp
              </button>
            )}
            <button
              onClick={onClose}
              className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold px-5 py-2 rounded-xl transition-colors"
            >
              ✓ Done
            </button>
          </div>

        </div>
      </div>
    </>
  );
};
