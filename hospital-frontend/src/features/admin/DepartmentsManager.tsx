import React, { useEffect, useState } from 'react';
import { userService } from '../../services/userService';
import { Department } from '../../types/user.types';
import { Table, Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../hooks/useToast';
import { Plus, Trash2, Building2 } from 'lucide-react';

export const DepartmentsManager: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const toast = useToast();

  const fetchDepts = async () => {
    setIsLoading(true);
    try {
      const res = await userService.getDepartments();
      setDepartments(res.data || []);
    } catch {
      toast.error('Error', 'Failed to fetch departments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userService.createDepartment({ name_en: nameEn, name_ar: nameAr });
      toast.success('Department Created', `Created department ${nameEn}`);
      setNameEn('');
      setNameAr('');
      setIsModalOpen(false);
      fetchDepts();
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Failed to create department.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await userService.deleteDepartment(id);
      toast.success('Deleted', 'Department removed.');
      fetchDepts();
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Failed to delete department.');
    }
  };

  const columns: Column<Department>[] = [
    { header: 'ID', accessorKey: 'id', className: 'w-16 font-mono text-xs' },
    {
      header: 'Department Name (EN)',
      cell: (d) => <span className="font-bold text-slate-900">{d.name_en}</span>,
    },
    {
      header: 'Department Name (AR)',
      cell: (d) => <span className="text-slate-600 font-arabic">{d.name_ar || '—'}</span>,
    },
    {
      header: 'Actions',
      cell: (d) => (
        <Button variant="danger" size="sm" onClick={() => handleDelete(d.id)}>
          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Hospital Departments</h1>
          <p className="text-xs text-slate-500 mt-1">Configure clinical and administrative departments</p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          Add Department
        </Button>
      </div>

      <Table columns={columns} data={departments} isLoading={isLoading} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Department">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Name (English)" required value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Cardiology" />
          <Input label="Name (Arabic - Optional)" value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="e.g. أمراض القلب" />
          <Button type="submit" variant="primary" className="w-full">Save Department</Button>
        </form>
      </Modal>
    </div>
  );
};
