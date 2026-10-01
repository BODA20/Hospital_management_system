import React, { useEffect, useState } from 'react';
import { nurseService } from '../../services/nurseService';
import { visitService } from '../../services/visitService';
import { Table, Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../hooks/useToast';
import { HeartPulse, Activity } from 'lucide-react';

export const VitalsQueueView: React.FC = () => {
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Vitals Entry Modal
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [bp, setBp] = useState('120/80');
  const [pulse, setPulse] = useState('72');
  const [temperature, setTemperature] = useState('36.6');
  const [weight, setWeight] = useState('70');
  const [respiratoryRate, setRespiratoryRate] = useState('16');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToast();

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const res = await nurseService.getVitalsQueue();
      setQueue(res.data || []);
    } catch {
      toast.error('Error', 'Failed to fetch vitals queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleOpenModal = (item: any) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleRecordVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setIsSubmitting(true);
    try {
      let visitId = selectedItem.visit_id;

      // If no visit exists yet (appointment-only item), create a check-in visit first
      if (!visitId) {
        const checkInRes = await visitService.nurseCheckIn({
          appointment_id: selectedItem.appointment_id || undefined,
          patient_id: selectedItem.patient_id,
          doctor_id: selectedItem.doctor_id,
          chief_complaint: selectedItem.chief_complaint || selectedItem.reason || 'General Consultation',
        });
        visitId = checkInRes.data?.id;
        if (!visitId) throw new Error('Failed to create visit for check-in');
      }

      await visitService.recordVitals(visitId, {
        bp: bp || undefined,
        pulse: pulse ? Number(pulse) : undefined,
        temperature: temperature ? Number(temperature) : undefined,
        weight: weight ? Number(weight) : undefined,
        respiratory_rate: respiratoryRate ? Number(respiratoryRate) : undefined,
      });

      toast.success('Vitals Recorded', `Saved vital signs for ${selectedItem.patient_name || 'Patient'}`);
      setIsModalOpen(false);
      fetchQueue();
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Failed to record vitals.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<any>[] = [
    { header: 'Appt / Visit #', accessorKey: 'appointment_id', className: 'w-24 font-mono text-xs' },
    {
      header: 'Patient Name',
      cell: (i) => <span className="font-bold text-slate-900">{i.patient_name || `Patient #${i.patient_id}`}</span>,
    },
    { header: 'Queue #', accessorKey: 'queue_number', className: 'w-20 font-bold text-teal-700 font-mono' },
    {
      header: 'Status',
      cell: (i) => <Badge status={i.status || 'awaiting_vitals'}>{i.status || 'Awaiting Vitals'}</Badge>,
    },
    {
      header: 'Actions',
      cell: (i) => (
        <Button variant="primary" size="sm" onClick={() => handleOpenModal(i)}>
          <HeartPulse className="w-3.5 h-3.5 mr-1" /> Record Vitals
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Vitals Queue</h1>
        <p className="text-xs text-slate-500 mt-1">Patient triage queue for capturing BP, pulse, temp, weight, and respiratory rates</p>
      </div>

      <Table columns={columns} data={queue} isLoading={isLoading} emptyMessage="No patients currently waiting for vitals." />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Record Vitals — ${selectedItem?.patient_name || 'Patient'}`}>
        <form onSubmit={handleRecordVitals} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Blood Pressure (bp)" placeholder="120/80" value={bp} onChange={(e) => setBp(e.target.value)} required />
            <Input label="Pulse (bpm)" type="number" placeholder="72" value={pulse} onChange={(e) => setPulse(e.target.value)} required />
            <Input label="Temperature (°C)" type="number" step="0.1" placeholder="36.6" value={temperature} onChange={(e) => setTemperature(e.target.value)} required />
            <Input label="Weight (kg)" type="number" step="0.1" placeholder="70" value={weight} onChange={(e) => setWeight(e.target.value)} required />
          </div>

          <Input label="Respiratory Rate (breaths/min)" type="number" placeholder="16" value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} required />

          <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
            Save Vitals & Send to Doctor
          </Button>
        </form>
      </Modal>
    </div>
  );
};
