import React, { useEffect, useState } from 'react';
import { appointmentService } from '../../services/appointmentService';
import { visitService } from '../../services/visitService';
import { Appointment } from '../../types/appointment.types';
import { Visit, Vitals } from '../../types/visit.types';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Table, Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Calendar, CheckCircle2, Clock, Stethoscope, HeartPulse, Thermometer, Activity, Weight, Wind, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { PrescriptionPrint, PrescriptionData } from '../../components/prescription/PrescriptionPrint';

export const DoctorDashboard: React.FC = () => {
  const [schedule, setSchedule] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const toast = useToast();

  // Consultation modal state
  const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);
  const [existingVisit, setExistingVisit] = useState<Visit | null>(null);
  const [vitals, setVitals] = useState<Vitals | null>(null);
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [notes, setNotes] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingVisit, setIsLoadingVisit] = useState(false);

  // Prescription print overlay state
  const [rxData, setRxData] = useState<PrescriptionData | null>(null);

  useEffect(() => {
    appointmentService
      .getDoctorScheduleToday()
      .then((res) => { const d = res.data as any; setSchedule(Array.isArray(d) ? d : (d?.appointments || d?.schedule || [])); })
      .catch(() => setSchedule([]))
      .finally(() => setIsLoading(false));
  }, []);

  const totalToday = schedule.length;
  const completedToday = schedule.filter((a) => a.status === 'completed').length;
  const remainingToday = schedule.filter((a) => a.status !== 'completed' && a.status !== 'cancelled').length;

  const openConsultationModal = async (app: Appointment) => {
    setSelectedApp(app);
    setReasonForVisit(app.reason || 'General Consultation');
    setDiagnosis('');
    setTreatmentPlan('');
    setNotes('');
    setVitals(null);
    setExistingVisit(null);
    setIsModalOpen(true);

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
      // No visit found yet, continue
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
      toast.success('Consultation Completed', `Visit record saved for ${selectedApp.patient_name || `Patient #${selectedApp.patient_id}`}`);

      // Build prescription data and show print overlay
      setRxData({
        appointmentId:      selectedApp.id,
        appointmentDate:    selectedApp.appointment_date || selectedApp.starts_at?.split('T')[0],
        queueNumber:          selectedApp.queue_number ?? undefined,
        doctorName:         selectedApp.doctor_name || 'Doctor',
        doctorSpecialization: selectedApp.doctor_specialization,
        doctorDepartment:   selectedApp.department_name,
        patientName:        selectedApp.patient_name || `Patient #${selectedApp.patient_id}`,
        patientPhone:       selectedApp.patient_phone,
        reasonForVisit:     reasonForVisit,
        diagnosis:          diagnosis,
        treatmentPlan:      treatmentPlan,
        notes:              notes,
        printedAt:          new Date().toISOString(),
      });

      setIsModalOpen(false);
      // Refresh schedule in the background
      appointmentService.getDoctorScheduleToday().then((res) => {
        const d = res.data as any;
        setSchedule(Array.isArray(d) ? d : (d?.appointments || d?.schedule || []));
      });
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Failed to record visit notes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Appointment>[] = [
    { header: 'Queue #', accessorKey: 'queue_number', className: 'w-20 font-bold text-teal-700' },
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
      header: 'Status',
      cell: (a) => <Badge status={a.status}>{a.status}</Badge>,
    },
    {
      header: 'Actions',
      cell: (a) =>
        a.status === 'completed' ? (
          <Badge status="completed">Completed</Badge>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => openConsultationModal(a)}
          >
            <Stethoscope className="w-3.5 h-3.5 mr-1" /> View & Consult
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Doctor Clinical Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">Overview of today's consultation schedule, patient queue, and clinical duties</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/doctor/schedule')}>
          <Calendar className="w-4 h-4 mr-2" /> Open Full Schedule
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Consultations Today" value={isLoading ? '...' : totalToday} icon={<Calendar className="w-5 h-5" />} color="teal" />
        <StatCard title="Completed Patients" value={isLoading ? '...' : completedToday} icon={<CheckCircle2 className="w-5 h-5" />} color="emerald" />
        <StatCard title="Remaining Queue" value={isLoading ? '...' : remainingToday} icon={<Clock className="w-5 h-5" />} color="amber" />
      </div>

      <Card header={<div className="font-bold text-slate-900 text-sm">Today's Patient Consultation Queue</div>}>
        <Table columns={columns} data={schedule} isLoading={isLoading} emptyMessage="No appointments scheduled for today." />
      </Card>

      {/* Consultation & Vitals Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Clinical Record — ${selectedApp?.patient_name || `Patient #${selectedApp?.patient_id}`}`}
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
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
                Complete Consultation &amp; Save Clinical Record
              </Button>
            </form>
          </div>
        )}
      </Modal>

      {/* ── Prescription Print Overlay ── */}
      {rxData && (
        <PrescriptionPrint
          data={rxData}
          onClose={() => setRxData(null)}
        />
      )}
    </div>
  );
};
