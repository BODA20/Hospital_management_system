import React, { useEffect, useState } from 'react';
import { appointmentService } from '../../services/appointmentService';
import { visitService } from '../../services/visitService';
import { Appointment } from '../../types/appointment.types';
import { Visit, Vitals } from '../../types/visit.types';
import { Table, Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../hooks/useToast';
import { Stethoscope, HeartPulse, Thermometer, Activity, Weight, Wind } from 'lucide-react';

export const TodayScheduleView: React.FC = () => {
  const [schedule, setSchedule] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Visit Notes Modal
  const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);
  const [existingVisit, setExistingVisit] = useState<Visit | null>(null);
  const [vitals, setVitals] = useState<Vitals | null>(null);
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [notes, setNotes] = useState('');
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingVisit, setIsLoadingVisit] = useState(false);

  const toast = useToast();

  const fetchSchedule = async () => {
    setIsLoading(true);
    try {
      const res = await appointmentService.getDoctorScheduleToday();
      const d = res.data as any;
      setSchedule(Array.isArray(d) ? d : (d?.appointments || d?.schedule || []));
    } catch {
      toast.error('Error', 'Failed to load daily schedule.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleOpenVisitModal = async (app: Appointment) => {
    setSelectedApp(app);
    setReasonForVisit(app.reason || 'General Consultation');
    setDiagnosis('');
    setTreatmentPlan('');
    setNotes('');
    setVitals(null);
    setExistingVisit(null);
    setIsVisitModalOpen(true);

    // Load the linked visit & vitals directly by appointment ID
    setIsLoadingVisit(true);
    try {
      const res = await visitService.getVisitByAppointmentId(app.id);
      const linked: Visit | null = res.data || null;
      if (linked) {
        setExistingVisit(linked);
        setVitals(linked.vitals || null);
        if (linked.reason_for_visit) setReasonForVisit(linked.reason_for_visit);
        if (linked.diagnosis && linked.diagnosis !== 'Pending — to be completed by doctor') setDiagnosis(linked.diagnosis);
        if (linked.treatment_plan) setTreatmentPlan(linked.treatment_plan || '');
        if (linked.notes && linked.notes !== 'Patient checked in by nurse.') setNotes(linked.notes || '');
      }
    } catch {
      // No visit found yet, proceed normally
    } finally {
      setIsLoadingVisit(false);
    }
  };

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    setIsSubmitting(true);
    try {
      if (existingVisit) {
        await visitService.updateVisit(existingVisit.id, { diagnosis, treatment_plan: treatmentPlan, notes });
      } else {
        await visitService.createVisit({
          patient_id: selectedApp.patient_id,
          doctor_id: selectedApp.doctor_id,
          appointment_id: selectedApp.id,
          reason_for_visit: reasonForVisit,
          diagnosis,
          treatment_plan: treatmentPlan,
          notes,
        });
      }

      await appointmentService.completeAppointment(selectedApp.id);
      toast.success('Consultation Completed', `Recorded visit and diagnosis for ${selectedApp.patient_name || `Patient #${selectedApp.patient_id}`}`);
      setIsVisitModalOpen(false);
      fetchSchedule();
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Failed to record visit notes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Appointment>[] = [
    { header: 'Queue #', accessorKey: 'queue_number', className: 'w-20 font-bold text-teal-700 font-mono' },
    {
      header: 'Patient Name',
      cell: (a) => (
        <div>
          <p className="font-bold text-slate-900">{a.patient_name || `Patient #${a.patient_id}`}</p>
          <p className="text-xs text-slate-400">{a.patient_phone || '—'}</p>
        </div>
      ),
    },
    { header: 'Time Slot', accessorKey: 'time_slot', className: 'font-mono text-xs' },
    {
      header: 'Reason',
      cell: (a) => <span className="text-xs text-slate-600">{a.reason || 'General Consult'}</span>,
    },
    {
      header: 'Status',
      cell: (a) => <Badge status={a.status}>{a.status}</Badge>,
    },
    {
      header: 'Actions',
      cell: (a) =>
        a.status === 'completed' ? (
          <Badge status="completed">Completed</Badge>
        ) : (
          <Button variant="primary" size="sm" onClick={() => handleOpenVisitModal(a)}>
            <Stethoscope className="w-3.5 h-3.5 mr-1" /> Start Consultation
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Today's Consultation Schedule</h1>
        <p className="text-xs text-slate-500 mt-1">Sequential queue board for today's active patient consultations</p>
      </div>

      <Table columns={columns} data={schedule} isLoading={isLoading} emptyMessage="No appointments scheduled for today." />

      {/* Clinical Notes & Vitals Modal */}
      <Modal
        isOpen={isVisitModalOpen}
        onClose={() => setIsVisitModalOpen(false)}
        title={`Clinical Visit Record — ${selectedApp?.patient_name || `Patient #${selectedApp?.patient_id}`}`}
        maxWidth="xl"
      >
        {isLoadingVisit ? (
          <div className="text-center py-6 text-slate-500 text-sm">Loading patient vitals & visit record...</div>
        ) : (
          <div className="space-y-5">
            {/* Vitals Section */}
            {vitals ? (
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <HeartPulse className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Patient Vitals (Recorded by Nurse)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {vitals.bp && (
                    <div className="bg-white rounded-lg p-3 border border-teal-100 text-center">
                      <Activity className="w-4 h-4 text-rose-500 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">Blood Pressure</p>
                      <p className="font-bold text-slate-900">{vitals.bp}</p>
                    </div>
                  )}
                  {vitals.pulse && (
                    <div className="bg-white rounded-lg p-3 border border-teal-100 text-center">
                      <HeartPulse className="w-4 h-4 text-rose-500 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">Pulse</p>
                      <p className="font-bold text-slate-900">{vitals.pulse} bpm</p>
                    </div>
                  )}
                  {vitals.temperature && (
                    <div className="bg-white rounded-lg p-3 border border-teal-100 text-center">
                      <Thermometer className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">Temperature</p>
                      <p className="font-bold text-slate-900">{vitals.temperature}°C</p>
                    </div>
                  )}
                  {vitals.weight && (
                    <div className="bg-white rounded-lg p-3 border border-teal-100 text-center">
                      <Weight className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">Weight</p>
                      <p className="font-bold text-slate-900">{vitals.weight} kg</p>
                    </div>
                  )}
                  {(vitals as any).respiratory_rate && (
                    <div className="bg-white rounded-lg p-3 border border-teal-100 text-center">
                      <Wind className="w-4 h-4 text-cyan-500 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">Resp. Rate</p>
                      <p className="font-bold text-slate-900">{(vitals as any).respiratory_rate} /min</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center gap-2 text-slate-500 text-xs">
                <HeartPulse className="w-4 h-4" />
                No vitals recorded yet for this patient.
              </div>
            )}

            {/* Consultation Form */}
            <form onSubmit={handleCreateVisit} className="space-y-4">
              <Input label="Reason for Visit" value={reasonForVisit} onChange={(e) => setReasonForVisit(e.target.value)} required />
              <Input label="Primary Clinical Diagnosis" placeholder="e.g. Acute Bronchitis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} required />

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">Treatment Plan & Prescription</label>
                <textarea
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-teal-600 focus:outline-none"
                  rows={3}
                  placeholder="Prescribed medications, lab tests, or follow-up instructions..."
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">Doctor Clinical Notes</label>
                <textarea
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-teal-600 focus:outline-none"
                  rows={2}
                  placeholder="Additional confidential doctor notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
                Complete Consultation & Save Clinical Record
              </Button>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
};
