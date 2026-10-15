import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Check, X, Trash2, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface Report {
  id: string;
  listing_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  listing_title?: string;
  reporter_name?: string;
}

const AdminReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteListingId, setDeleteListingId] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reported_listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with listing and reporter info
      const enriched: Report[] = [];
      for (const report of data || []) {
        const { data: listing } = await supabase
          .from('listings')
          .select('title')
          .eq('id', report.listing_id)
          .maybeSingle();

        const { data: reporter } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', report.reporter_id)
          .maybeSingle();

        enriched.push({
          ...report,
          listing_title: listing?.title || 'Deleted Listing',
          reporter_name: reporter?.name || 'Unknown',
        });
      }

      setReports(enriched);
    } catch (err) {
      console.error('Error fetching reports:', err);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId: string, status: string) => {
    setActionLoading(reportId);
    try {
      const { error } = await supabase
        .from('reported_listings')
        .update({ 
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      // Log admin action
      await supabase.from('admin_audit_logs').insert([{
        admin_id: user?.id,
        action: `report_${status}`,
        entity_type: 'report',
        entity_id: reportId,
        details: { status },
      }]);

      setReports(prev => prev.map(r => 
        r.id === reportId ? { ...r, status } : r
      ));
      toast.success(`Report marked as ${status}`);
    } catch (err) {
      toast.error('Failed to update report');
    } finally {
      setActionLoading(null);
    }
  };

  const removeListing = async (listingId: string, reportId: string) => {
    setActionLoading(reportId);
    try {
      // Archive the listing instead of deleting
      const { error } = await supabase
        .from('listings')
        .update({ status: 'archived' })
        .eq('id', listingId);

      if (error) throw error;

      // Mark report as resolved
      await supabase
        .from('reported_listings')
        .update({ 
          status: 'resolved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      // Log admin action
      await supabase.from('admin_audit_logs').insert([{
        admin_id: user?.id,
        action: 'listing_removed',
        entity_type: 'listing',
        entity_id: listingId,
        details: { report_id: reportId, reason: 'report_violation' },
      }]);

      fetchReports();
      toast.success('Listing removed and report resolved');
    } catch (err) {
      toast.error('Failed to remove listing');
    } finally {
      setActionLoading(null);
      setDeleteListingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'reviewed':
        return <Badge className="bg-blue-100 text-blue-800">Reviewed</Badge>;
      case 'resolved':
        return <Badge className="bg-green-100 text-green-800">Resolved</Badge>;
      case 'dismissed':
        return <Badge className="bg-gray-100 text-gray-800">Dismissed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'scam': return 'Suspected scam';
      case 'inappropriate': return 'Inappropriate';
      case 'misleading': return 'Misleading';
      case 'wrong_category': return 'Wrong category';
      case 'duplicate': return 'Duplicate';
      default: return reason;
    }
  };

  return (
    <AdminLayout title="Reported Listings">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reports</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Reports</p>
            <p className="text-2xl font-bold">{reports.length}</p>
          </div>
          <div className="bg-card rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {reports.filter(r => r.status === 'pending').length}
            </p>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-card rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No reports found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Listing</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Link 
                        to={`/listing/${report.listing_id}`}
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {report.listing_title}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{getReasonLabel(report.reason)}</p>
                        {report.details && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {report.details}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{report.reporter_name}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(report.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {report.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateReportStatus(report.id, 'reviewed')}
                              disabled={actionLoading === report.id}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600"
                              onClick={() => updateReportStatus(report.id, 'dismissed')}
                              disabled={actionLoading === report.id}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteListingId(report.id)}
                              disabled={actionLoading === report.id}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {report.status === 'reviewed' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateReportStatus(report.id, 'dismissed')}
                              disabled={actionLoading === report.id}
                            >
                              Dismiss
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteListingId(report.id)}
                              disabled={actionLoading === report.id}
                            >
                              Remove Listing
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Confirm Remove Listing Dialog */}
      <AlertDialog open={!!deleteListingId} onOpenChange={() => setDeleteListingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive the listing and mark the report as resolved. The seller will no longer be able to see this listing in the marketplace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                const report = reports.find(r => r.id === deleteListingId);
                if (report) {
                  removeListing(report.listing_id, report.id);
                }
              }}
            >
              Remove Listing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminReports;
