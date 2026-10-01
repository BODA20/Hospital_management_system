import React, { useEffect, useState } from 'react';
import { userService } from '../../services/userService';
import { adminService } from '../../services/adminService';
import { User, UserRole } from '../../types/auth.types';
import { Department } from '../../types/user.types';
import { Table, Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { useToast } from '../../hooks/useToast';
import { UserPlus, Edit, Shield, Building2, SunMoon } from 'lucide-react';

export const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'staff' | 'patients'>('staff');
  const toast = useToast();

  // Create Staff Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'doctor' as UserRole,
    department_id: '',
    assigned_shift: 'Morning',
    password: '',
  });

  // Assign Dept / Shift Modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [assignDeptId, setAssignDeptId] = useState('');
  const [assignShift, setAssignShift] = useState<'Morning' | 'Night'>('Morning');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [uRes, dRes] = await Promise.all([
        userService.getAllUsers(),
        userService.getDepartments(),
      ]);
      setUsers(uRes.data || []);
      setDepartments(dRes.data || []);
    } catch {
      toast.error('Error', 'Failed to load user directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminService.createStaffAccount({
        ...newStaff,
        department_id: newStaff.department_id ? Number(newStaff.department_id) : undefined,
      });
      toast.success('Staff Account Created', `Created ${newStaff.role} account for ${newStaff.full_name}`);
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error('Creation Failed', err.response?.data?.message || 'Failed to create staff account.');
    }
  };

  const handleAssignDeptShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      if (assignDeptId && ['doctor', 'nurse'].includes(selectedUser.role)) {
        await adminService.assignDepartment(selectedUser.id, Number(assignDeptId));
      }
      await adminService.reassignShift(selectedUser.id, assignShift);
      toast.success('Updated Staff Assignment', `Assigned ${selectedUser.full_name} to ${assignShift} shift.`);
      setIsAssignModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Failed to update assignment.');
    }
  };

  const staffUsers = users.filter((u) => u.role !== 'patient');
  const patientUsers = users.filter((u) => u.role === 'patient');

  const allColumns: Column<User>[] = [
    { header: 'ID', accessorKey: 'id', className: 'w-16 font-mono text-xs' },
    {
      header: 'Name & Email',
      cell: (user) => (
        <div>
          <p className="font-bold text-slate-900">{user.full_name}</p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
      ),
    },
    {
      header: 'Role',
      cell: (user) => <Badge variant="teal">{user.role}</Badge>,
    },
    {
      header: 'Shift',
      cell: (user) =>
        user.role === 'patient' ? (
          <span className="text-slate-400 text-xs">-</span>
        ) : user.assigned_shift ? (
          <Badge status={user.assigned_shift}>{user.assigned_shift}</Badge>
        ) : (
          <span className="text-slate-400 text-xs">-</span>
        ),
    },
    {
      header: 'Status',
      cell: (user) => <Badge status={user.is_active ? 'active' : 'deactivated'}>{user.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      header: 'Actions',
      cell: (user) => (
        <div className="flex items-center gap-2">
          {user.role !== 'patient' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedUser(user);
                setAssignShift(user.assigned_shift || 'Morning');
                setIsAssignModalOpen(true);
              }}
            >
              <Edit className="w-3.5 h-3.5 mr-1" /> Reassign
            </Button>
          ) : (
            <span className="text-slate-400 text-xs">-</span>
          )}
        </div>
      ),
    },
  ];

  const displayedColumns = activeTab === 'patients'
    ? allColumns.filter((col) => col.header !== 'Shift')
    : allColumns;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">User & Staff Administration</h1>
          <p className="text-xs text-slate-500 mt-1">Manage system accounts, roles, shifts, and department allocations</p>
        </div>
        <Button variant="primary" leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => setIsCreateModalOpen(true)}>
          Create Staff Member
        </Button>
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as 'staff' | 'patients')}
        tabs={[
          { id: 'staff', label: 'Staff Members', count: staffUsers.length },
          { id: 'patients', label: 'Patients', count: patientUsers.length },
        ]}
      />

      <Table
        columns={displayedColumns}
        data={activeTab === 'staff' ? staffUsers : patientUsers}
        isLoading={isLoading}
        emptyMessage={`No ${activeTab === 'staff' ? 'staff members' : 'patients'} found.`}
      />

      {/* Create Staff Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Staff Account" maxWidth="md">
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <Input label="Full Name" required value={newStaff.full_name} onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })} />
          <Input label="Email" type="email" required value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} />
          <Input label="Phone" type="tel" value={newStaff.phone} onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })} />
          
          <Select
            label="Staff Role"
            value={newStaff.role}
            onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as UserRole })}
            options={[
              { label: 'Doctor', value: 'doctor' },
              { label: 'Nurse', value: 'nurse' },
              { label: 'Receptionist', value: 'receptionist' },
              { label: 'Administrator', value: 'admin' },
            ]}
          />

          <Select
            label="Department"
            value={newStaff.department_id}
            onChange={(e) => setNewStaff({ ...newStaff, department_id: e.target.value })}
            options={departments.map((d) => ({ label: d.name_en, value: d.id }))}
            placeholder="Select Department (Optional)"
          />

          <Select
            label="Assigned Shift"
            value={newStaff.assigned_shift}
            onChange={(e) => setNewStaff({ ...newStaff, assigned_shift: e.target.value as any })}
            options={[
              { label: 'Morning Shift', value: 'Morning' },
              { label: 'Night Shift', value: 'Night' },
            ]}
          />

          <Input label="Temporary Password" type="password" placeholder="Defaults to StaffTemp123!" value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} />

          <Button type="submit" variant="primary" className="w-full">Create Staff Member</Button>
        </form>
      </Modal>

      {/* Reassign Shift/Dept Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title={`Reassign ${selectedUser?.full_name}`}>
        <form onSubmit={handleAssignDeptShift} className="space-y-4">
          <Select
            label="Department Assignment"
            value={assignDeptId}
            onChange={(e) => setAssignDeptId(e.target.value)}
            options={departments.map((d) => ({ label: d.name_en, value: d.id }))}
            placeholder="Choose Department"
          />

          <Select
            label="Work Shift"
            value={assignShift}
            onChange={(e) => setAssignShift(e.target.value as 'Morning' | 'Night')}
            options={[
              { label: 'Morning Shift', value: 'Morning' },
              { label: 'Night Shift', value: 'Night' },
            ]}
          />

          <Button type="submit" variant="primary" className="w-full">Save Assignment</Button>
        </form>
      </Modal>
    </div>
  );
};
