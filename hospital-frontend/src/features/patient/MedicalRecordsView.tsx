import React, { useEffect, useState } from 'react';
import { visitService } from '../../services/visitService';
import { Visit } from '../../types/visit.types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { FileText, HeartPulse, Loader2, RefreshCw, FolderOpen } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';

export const MedicalRecordsView: React.FC = () => {
  const [records, setRecords] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const loadMedicalRecords = async () => {
    setIsLoading(true);
    try {
      const res = await visitService.getMyRecords();
      // Extract array from response ({ data: { visits: [...] } } or { data: [...] })
      const rawData = res.data as any;
      const list = Array.isArray(rawData) ? rawData : (rawData?.visits || []);
      setRecords(list);
    } catch {
      toast.error('Error', 'Failed to load medical records history.');
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMedicalRecords();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Medical Records & Visit History</h1>
          <p className="text-xs text-slate-500 mt-1">Official electronic health records, clinical diagnoses, and prescriptions</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadMedicalRecords}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Records
        </Button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <Card padding="lg" className="text-center py-16">
            <Loader2 className="w-10 h-10 text-teal-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading Medical Records...</p>
            <p className="text-xs text-slate-400 mt-1">Fetching your official electronic health records</p>
          </Card>
        ) : records.length === 0 ? (
          <Card padding="lg" className="text-center py-16 space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Medical Records Available Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Your official visit reports, clinical diagnoses, and prescriptions will be automatically displayed here after completed doctor consultations.
            </p>
            <Button variant="secondary" size="sm" onClick={loadMedicalRecords} className="mt-2">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Check Again
            </Button>
          </Card>
        ) : (
          records.map((record) => (
            <Card key={record.id} padding="lg">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{record.reason_for_visit || 'General Consultation'}</h3>
                    <p className="text-xs text-slate-400">Visit Date: {formatDate(record.created_at || record.check_in_at)}</p>
                  </div>
                </div>

                <Badge status={record.status || 'completed'}>{record.status || 'completed'}</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Clinical Diagnosis</span>
                  <p className="text-slate-900 font-medium">{record.diagnosis || 'Pending doctor entry...'}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Treatment Plan & Prescription</span>
                  <p className="text-slate-900 font-medium">{record.treatment_plan || 'No prescription specified.'}</p>
                </div>
              </div>

              {record.vitals && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-600">
                  <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><HeartPulse className="w-3.5 h-3.5 text-teal-600" /> Vital Signs:</span>
                  {record.vitals.bp && <span>BP: <strong className="text-slate-900">{record.vitals.bp}</strong></span>}
                  {record.vitals.pulse && <span>Pulse: <strong className="text-slate-900">{record.vitals.pulse} bpm</strong></span>}
                  {record.vitals.temperature && <span>Temp: <strong className="text-slate-900">{record.vitals.temperature} °C</strong></span>}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
