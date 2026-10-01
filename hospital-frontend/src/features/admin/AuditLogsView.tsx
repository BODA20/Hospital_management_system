import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { SecurityLog } from '../../types/dashboard.types';
import { Table, Column } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../hooks/useToast';
import { Search, ShieldAlert } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState('');
  const toast = useToast();

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getSecurityLogs({ search, action_type: actionType });
      setLogs(res.data || []);
    } catch {
      toast.error('Error', 'Failed to load security audit logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, actionType]);

  const columns: Column<SecurityLog>[] = [
    { header: 'ID', accessorKey: 'id', className: 'w-16 font-mono text-xs' },
    {
      header: 'Timestamp',
      cell: (l) => <span className="text-xs text-slate-500 font-mono">{formatDateTime(l.created_at)}</span>,
    },
    {
      header: 'Actor',
      cell: (l) => (
        <div>
          <p className="font-bold text-slate-900 text-xs">{l.actor_name}</p>
          {l.user_id && <p className="text-[10px] text-slate-400 font-mono">User #{l.user_id}</p>}
        </div>
      ),
    },
    {
      header: 'Action Type',
      cell: (l) => <Badge variant="teal">{l.action_type}</Badge>,
    },
    {
      header: 'Description',
      cell: (l) => <span className="text-xs text-slate-700">{l.description}</span>,
    },
    {
      header: 'IP Address',
      cell: (l) => <span className="font-mono text-xs text-slate-400">{l.ip_address || '—'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Security & Audit Event Logs</h1>
          <p className="text-xs text-slate-500 mt-1">Immutable security event history, authentication attempts, and operational changes</p>
        </div>

        <div className="flex items-center gap-3">
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="w-64"
          />
        </div>
      </div>

      <Table columns={columns} data={logs} isLoading={isLoading} emptyMessage="No audit logs recorded." />
    </div>
  );
};
