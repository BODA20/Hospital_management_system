import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Table, Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../hooks/useToast';
import { CheckCircle2, XCircle, ClipboardList } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export const OperationalRequestsView: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getStaffRequests();
      setRequests(res.data || []);
    } catch {
      toast.error('Error', 'Failed to fetch operational requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await adminService.approveStaffRequest(id);
      toast.success('Request Approved', 'Staff request has been approved.');
      fetchRequests();
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Failed to approve request.');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await adminService.rejectStaffRequest(id);
      toast.info('Request Rejected', 'Staff request has been rejected.');
      fetchRequests();
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Failed to reject request.');
    }
  };

  const columns: Column<any>[] = [
    { header: 'ID', accessorKey: 'id', className: 'w-16 font-mono text-xs' },
    {
      header: 'Role',
      cell: (r) => <Badge variant="teal">{r.role || 'Staff'}</Badge>,
    },
    {
      header: 'Status',
      cell: (r) => <Badge status={r.status}>{r.status}</Badge>,
    },
    {
      header: 'Created Date',
      cell: (r) => formatDate(r.created_at),
    },
    {
      header: 'Actions',
      cell: (r) =>
        r.status === 'pending' ? (
          <div className="flex items-center gap-2">
            <Button variant="teal" size="sm" onClick={() => handleApprove(r.id)}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
            </Button>
            <Button variant="danger" size="sm" onClick={() => handleReject(r.id)}>
              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
            </Button>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Resolved</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Staff Operational Requests</h1>
        <p className="text-xs text-slate-500 mt-1">Review operational, supply, and shift requests submitted by active staff members</p>
      </div>

      <Table columns={columns} data={requests} isLoading={isLoading} emptyMessage="No operational requests pending." />
    </div>
  );
};
