import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { 
  Search, 
  CheckCircle2,
  XCircle,
  UserCheck,
  UserX,
  Clock
} from "lucide-react";
import Layout from "@/components/Layout";
import PageWrapper from "@/components/PageWrapper";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";

type AccountStatus = 'active' | 'inactive' | 'pending' | 'suspended';
type UserRole = 'admin' | 'instructor' | 'user';

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  status: AccountStatus;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
}

// Role Badge Component
const RoleBadge = ({ role }: { role: UserRole }) => {
  const roleStyles = {
    admin: "bg-primary/10 text-primary",
    instructor: "bg-secondary/10 text-secondary-foreground",
    user: "bg-muted text-muted-foreground"
  };

  return (
    <Badge className={roleStyles[role]}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  );
};

// Status Badge Component
const StatusBadge = ({ status }: { status: AccountStatus }) => {
  const statusStyles = {
    active: { className: "bg-green-100 text-green-800", icon: <UserCheck className="w-3 h-3 mr-1" /> },
    inactive: { className: "bg-gray-100 text-gray-600", icon: <UserX className="w-3 h-3 mr-1" /> },
    pending: { className: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-3 h-3 mr-1" /> },
    suspended: { className: "bg-red-100 text-red-800", icon: <XCircle className="w-3 h-3 mr-1" /> }
  };

  return (
    <Badge className={statusStyles[status].className}>
      <div className="flex items-center">
        {statusStyles[status].icon}
        <span className="capitalize">{status}</span>
      </div>
    </Badge>
  );
};

const Accounts = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const { user } = useAuth();
  


  // Load current user profile and determine if admin
  const loadCurrentUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setCurrentUserProfile(data);
      
      // If user is admin, load all profiles, otherwise just set their own
      if (data?.role === 'admin') {
        loadAllProfiles();
      } else {
        setProfiles([data]);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      toast.error('Failed to load profile');
      setIsLoading(false);
    }
  };

  // Load all profiles (only for admins)
  const loadAllProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
      toast.error('Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadCurrentUserProfile();
    }
  }, [user]);

  // Approve user
  const handleApprove = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('approve_user', {
        user_id: userId,
        approver_id: user?.id
      });

      if (error) throw error;
      
      toast.success('User approved successfully');
      if (currentUserProfile?.role === 'admin') {
        loadAllProfiles();
      }
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    }
  };

  // Reject user
  const handleReject = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('reject_user', {
        user_id: userId,
        rejector_id: user?.id
      });

      if (error) throw error;
      
      toast.success('User rejected successfully');
      if (currentUserProfile?.role === 'admin') {
        loadAllProfiles();
      }
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject user');
    }
  };



  // Filter profiles
  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = 
      `${profile.first_name} ${profile.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || profile.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || profile.status === selectedStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-4">
          <div className="text-center">Loading accounts...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageWrapper skeletonType="table">
        <div className="px-6 py-4 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Account Management</h1>
            <p className="text-muted-foreground">
              Manage user accounts and access permissions
            </p>
          </div>

        </div>

        {/* Show search and filters only for admins */}
        {currentUserProfile?.role === 'admin' && (
          <div className="flex items-center justify-between gap-4 p-0">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative min-w-[280px] max-w-[400px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="search"
                  placeholder="Search accounts..."
                  className="pl-10 h-10 w-full text-sm bg-background border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="h-10 min-w-[140px] border-border hover:bg-muted/80 transition-colors duration-200">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border shadow-elegant">
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="instructor">Instructor</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-10 min-w-[140px] border-border hover:bg-muted/80 transition-colors duration-200">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border shadow-elegant">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Show accounts table only for admins */}
        {currentUserProfile?.role === 'admin' ? (
          <Card>
            <CardHeader>
              <CardTitle>User Accounts</CardTitle>
              <CardDescription>
                {filteredProfiles.length} {filteredProfiles.length === 1 ? 'account' : 'accounts'} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {profile.first_name && profile.last_name 
                                ? `${profile.first_name} ${profile.last_name}`
                                : profile.email.split('@')[0]}
                            </div>
                            <div className="text-sm text-muted-foreground">{profile.email}</div>
                          </div>
                        </TableCell>
                        <TableCell><RoleBadge role={profile.role} /></TableCell>
                        <TableCell><StatusBadge status={profile.status} /></TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(profile.created_at), 'MMM d, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {profile.status === 'pending' && (
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(profile.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(profile.id)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* For non-admin users, show a message */
          <Card>
            <CardHeader>
              <CardTitle>Account Access</CardTitle>
              <CardDescription>
                You can only view and manage your own account information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Use the "My Account" button above to view and edit your profile information.
              </p>
            </CardContent>
          </Card>
        )}


        </div>
      </PageWrapper>
    </Layout>
  );
};

export default Accounts;