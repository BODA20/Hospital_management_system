import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { StaffApplication } from '../../types/dashboard.types';
import { Table, Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../hooks/useToast';
import { CheckCircle2, XCircle, UserCheck } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export const StaffApplicationsView: React.FC = () => {
  const [applications, setApplications] = useState<StaffApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reject Modal State
  const [selectedApp, setSelectedApp] = useState<StaffApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const toast = useToast();

  const fetchApps = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getAllApplications();
      setApplications(res.data || []);
    } catch {
      toast.error('Error', 'Failed to fetch staff applications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await adminService.processApplication(id, 'approved');
      toast.success('Application Approved', 'Role updated and profile auto-provisioned.');
      fetchApps();
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Failed to approve application.');
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    try {
      await adminService.processApplication(selectedApp.id, 'rejected', rejectionReason);
      toast.info('Application Rejected', 'Applicant notified.');
      setIsRejectModalOpen(false);
      fetchApps();
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Failed to reject application.');
    }
  };

  const columns: Column<StaffApplication>[] = [
    { header: 'App #', accessorKey: 'id', className: 'w-16 font-mono text-xs' },
    { header: 'User ID', accessorKey: 'user_id', className: 'w-20 font-mono text-xs' },
    {
      header: 'Requested Role',
      cell: (app) => <Badge variant="teal">{app.requested_role}</Badge>,
    },
    {
      header: 'Shift',
      cell: (app) => <Badge status={app.requested_shift}>{app.requested_shift}</Badge>,
    },
    {
      header: 'License #',
      cell: (app) => app.license_number ? <span className="font-mono text-xs">{app.license_number}</span> : <span className="text-slate-400 text-xs">—</span>,
    },
    {
      header: 'Submitted Date',
      cell: (app) => formatDate(app.created_at),
    },
    {
      header: 'Status',
      cell: (app) => <Badge status={app.status}>{app.status}</Badge>,
    },
    {
      header: 'Actions',
      cell: (app) =>
        app.status === 'pending' ? (
          <div className="flex items-center gap-2">
            <Button variant="teal" size="sm" onClick={() => handleApprove(app.id)}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setSelectedApp(app);
                setIsRejectModalOpen(true);
              }}
            >
              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
            </Button>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-medium">Processed</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Staff Applications</h1>
        <p className="text-xs text-slate-500 mt-1">Review requests from candidates applying for Doctor or Nurse roles</p>
      </div>

      <Table columns={columns} data={applications} isLoading={isLoading} emptyMessage="No staff applications pending." />

      <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Reject Application">
        <form onSubmit={handleReject} className="space-y-4">
          <Input
            label="Rejection Reason"
            placeholder="Min 5 characters requirement..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            required
          />
          <Button type="submit" variant="danger" className="w-full">
            Confirm Rejection
          </Button>
        </form>
      </Modal>
    </div>
  );
};
