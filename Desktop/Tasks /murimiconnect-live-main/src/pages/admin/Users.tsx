import { useEffect, useState } from 'react';
import { Search, MoreVertical, User, Shield, ShoppingCart, Tractor, Mail, Phone, MapPin, Loader2, Ban, CheckCircle } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UserWithRole {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  province: string | null;
  avatar_url: string | null;
  created_at: string | null;
  suspended: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
  role: 'farmer' | 'buyer' | 'admin' | 'driver' | null;
}

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; user: UserWithRole | null; action: 'suspend' | 'unsuspend' }>({
    open: false,
    user: null,
    action: 'suspend',
  });
  const [suspendReason, setSuspendReason] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      const usersWithRoles: UserWithRole[] = (profiles || []).map(p => ({
        ...p,
        suspended: p.suspended ?? false,
        suspended_at: p.suspended_at ?? null,
        suspended_reason: p.suspended_reason ?? null,
        role: rolesMap.get(p.id) || null,
      }));

      setUsers(usersWithRoles);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const logAdminAction = async (action: string, entityId: string, details: any) => {
    if (!currentUser) return;
    await supabase.from('admin_audit_logs').insert([{
      admin_id: currentUser.id,
      action,
      entity_type: 'user',
      entity_id: entityId,
      details,
    }]);
  };

  const handleChangeRole = async (userId: string, newRole: 'farmer' | 'buyer' | 'admin') => {
    try {
      // Check if role exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert([{ user_id: userId, role: newRole }]);
        if (error) throw error;
      }

      await logAdminAction('change_role', userId, { new_role: newRole });
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success('User role updated');
    } catch (err) {
      console.error('Error changing role:', err);
      toast.error('Failed to change role');
    }
  };

  const handleSuspendUser = async () => {
    if (!suspendDialog.user) return;

    const userId = suspendDialog.user.id;
    const isSuspending = suspendDialog.action === 'suspend';

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          suspended: isSuspending,
          suspended_at: isSuspending ? new Date().toISOString() : null,
          suspended_reason: isSuspending ? (suspendReason || 'Suspended by admin') : null,
        })
        .eq('id', userId);

      if (error) throw error;

      await logAdminAction(isSuspending ? 'suspend_user' : 'unsuspend_user', userId, {
        reason: suspendReason || undefined,
      });

      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { 
              ...u, 
              suspended: isSuspending, 
              suspended_at: isSuspending ? new Date().toISOString() : null,
              suspended_reason: isSuspending ? (suspendReason || 'Suspended by admin') : null,
            } 
          : u
      ));

      toast.success(isSuspending ? 'User suspended' : 'User unsuspended');
    } catch (err) {
      console.error('Error updating user suspension:', err);
      toast.error('Failed to update user status');
    } finally {
      setSuspendDialog({ open: false, user: null, action: 'suspend' });
      setSuspendReason('');
    }
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'admin': return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">Admin</Badge>;
      case 'farmer': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Farmer</Badge>;
      case 'buyer': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Buyer</Badge>;
      default: return <Badge variant="secondary">No Role</Badge>;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.phone?.includes(search);
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const suspendedCount = users.filter(u => u.suspended).length;

  return (
    <AdminLayout title="Users">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="farmer">Farmers</SelectItem>
            <SelectItem value="buyer">Buyers</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-card rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground">Total Users</p>
          <p className="text-2xl font-bold">{users.length}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground">Farmers</p>
          <p className="text-2xl font-bold">{users.filter(u => u.role === 'farmer').length}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground">Buyers</p>
          <p className="text-2xl font-bold">{users.filter(u => u.role === 'buyer').length}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground">Admins</p>
          <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground">Suspended</p>
          <p className="text-2xl font-bold text-destructive">{suspendedCount}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className={user.suspended ? 'opacity-60' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>
                              {user.name?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium">{user.name}</span>
                            {user.suspended && (
                              <p className="text-xs text-destructive">Suspended</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {user.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {user.email}
                            </div>
                          )}
                          {user.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.province && (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {user.province}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.suspended ? (
                          <Badge variant="destructive" className="gap-1">
                            <Ban className="h-3 w-3" />
                            Suspended
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-green-600 border-green-200">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleChangeRole(user.id, 'farmer')}>
                              <Tractor className="h-4 w-4 mr-2" />
                              Set as Farmer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeRole(user.id, 'buyer')}>
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Set as Buyer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeRole(user.id, 'admin')}>
                              <Shield className="h-4 w-4 mr-2" />
                              Set as Admin
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.suspended ? (
                              <DropdownMenuItem 
                                onClick={() => setSuspendDialog({ open: true, user, action: 'unsuspend' })}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Unsuspend User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => setSuspendDialog({ open: true, user, action: 'suspend' })}
                                className="text-destructive"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Suspend User
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Suspend/Unsuspend Dialog */}
      <AlertDialog open={suspendDialog.open} onOpenChange={(open) => setSuspendDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspendDialog.action === 'suspend' ? 'Suspend User?' : 'Unsuspend User?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suspendDialog.action === 'suspend' 
                ? `Are you sure you want to suspend ${suspendDialog.user?.name}? They will not be able to access the platform.`
                : `Are you sure you want to unsuspend ${suspendDialog.user?.name}? They will regain access to the platform.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          {suspendDialog.action === 'suspend' && (
            <div className="py-2">
              <Input
                placeholder="Reason for suspension (optional)"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSuspendReason('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspendUser}
              className={suspendDialog.action === 'suspend' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {suspendDialog.action === 'suspend' ? 'Suspend' : 'Unsuspend'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default Users;
