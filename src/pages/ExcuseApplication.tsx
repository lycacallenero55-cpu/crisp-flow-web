import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { FileText, Clock, AlertCircle, CheckCircle2, Plus, Search, Filter, Eye, Check, X, ChevronsUpDown, CalendarIcon, Edit, ZoomIn, ZoomOut, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";

type ExcuseStatus = 'pending' | 'approved' | 'rejected';

type ExcuseApplication = {
  id: string;
  student_id: number;
  session_id?: number;
  absence_date: string;
  
  documentation_url?: string;
  status: ExcuseStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
  // Related data
  students?: {
    id: number;
    firstname: string;
    surname: string;
    student_id: string;
    program: string;
    year: string;
    section: string;
  };
  sessions?: {
    id: number;
    title: string;
    date: string;
  };
};

type ExcuseFormData = {
  student_id: string;
  session_id?: string;
  absence_date: string;
  excuse_image?: File;
  documentation_url?: string;
};

const ExcuseApplicationContent = () => {
  const { toast } = useToast();
  const [excuses, setExcuses] = useState<ExcuseApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedExcuse, setSelectedExcuse] = useState<ExcuseApplication | null>(null);
  const [formData, setFormData] = useState<ExcuseFormData>({
    student_id: '',
    absence_date: '', // Keep for type compatibility but won't be used
  });
  const [students, setStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [openStudentSelect, setOpenStudentSelect] = useState(false);
  const [openSessionSelect, setOpenSessionSelect] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | number | null>(null);

  useEffect(() => {
    fetchExcuses();
    fetchStudents();
    fetchSessions();
  }, []);

  const fetchExcuses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('excuse_applications')
        .select(`
          *,
          students!student_id (
            id,
            firstname,
            surname,
            student_id,
            program,
            year,
            section
          ),
          sessions!session_id (
            id,
            title,
            date
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Fetched excuses data:', data);
      setExcuses(data || []);
    } catch (error) {
      console.error('Error fetching excuses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch excuse applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, firstname, surname, student_id, program, year, section')
        .order('firstname');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, title, date')
        .order('date', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const handleSubmitExcuse = async () => {
    try {
      let excuse_image_url = null;
      
      // Upload image if provided
      if (formData.excuse_image) {
        const fileExt = formData.excuse_image.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `excuse-letters/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('excuse-letters')
          .upload(filePath, formData.excuse_image);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('excuse-letters')
          .getPublicUrl(filePath);
          
        excuse_image_url = publicUrl;
      }

      if (isEditMode && selectedExcuse) {
        // Update existing excuse
        const { error } = await supabase
          .from('excuse_applications')
          .update({
            student_id: parseInt(formData.student_id),
            session_id: formData.session_id ? parseInt(formData.session_id) : null,
            absence_date: formData.absence_date,
            documentation_url: excuse_image_url || formData.documentation_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedExcuse.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Excuse application updated successfully",
        });
      } else {
        // Create new excuse
        const { error } = await supabase
          .from('excuse_applications')
          .insert([{
            student_id: parseInt(formData.student_id),
            session_id: formData.session_id ? parseInt(formData.session_id) : null,
            absence_date: formData.absence_date || new Date().toISOString().split('T')[0],
            documentation_url: excuse_image_url || formData.documentation_url,
            status: 'pending'
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Excuse application submitted successfully",
        });
      }

      setIsFormOpen(false);
      setIsEditMode(false);
      setSelectedExcuse(null);
      setFormData({
        student_id: '',
        absence_date: '',
      });
      fetchExcuses();
    } catch (error) {
      console.error('Error submitting excuse:', error);
      toast({
        title: "Error",
        description: isEditMode ? "Failed to update excuse application" : "Failed to submit excuse application",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async (id: string, status: ExcuseStatus, notes?: string) => {
    try {
      const { error } = await supabase
        .from('excuse_applications')
        .update({
          status,
          review_notes: notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Excuse application ${status}`,
      });

      fetchExcuses();
      setIsViewOpen(false);
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteExcuse = async (id: string | number) => {
    try {
      console.log('Deleting excuse with ID:', id, 'Type:', typeof id);
      
      // First, let's check what the actual ID looks like in the database
      const { data: checkData, error: checkError } = await supabase
        .from('excuse_applications')
        .select('id')
        .limit(1);
      
      if (checkError) {
        console.error('Error checking ID format:', checkError);
      } else {
        console.log('Sample ID from database:', checkData?.[0]?.id, 'Type:', typeof checkData?.[0]?.id);
      }
      
      // Try the delete operation
      const { error, count } = await supabase
        .from('excuse_applications')
        .delete()
        .eq('id', id);

      console.log('Delete result - Error:', error, 'Count:', count);
      
      // Also try to fetch the record to see if it exists
      const { data: checkRecord, error: checkRecordError } = await supabase
        .from('excuse_applications')
        .select('*')
        .eq('id', id)
        .single();
      
      console.log('Record check - Data:', checkRecord, 'Error:', checkRecordError);

      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }

      if (count === 0) {
        console.log('No records were deleted, trying alternative approach...');
        
        // Try alternative delete approach
        const { error: altError, count: altCount } = await supabase
          .from('excuse_applications')
          .delete()
          .eq('id', parseInt(id.toString()));
        
        console.log('Alternative delete result - Error:', altError, 'Count:', altCount);
        
        if (altCount === 0) {
          toast({
            title: "Warning",
            description: "No record found to delete",
            variant: "destructive",
          });
          return;
        }
      }

      console.log('Delete successful, refreshing list...');
      
      toast({
        title: "Success",
        description: "Excuse application deleted successfully",
      });

      // Refresh the list immediately
      await fetchExcuses();
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting excuse:', error);
      toast({
        title: "Error",
        description: "Failed to delete excuse application",
        variant: "destructive",
      });
    }
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (imageZoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - imagePan.x, y: e.clientY - imagePan.y });
    }
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (isDragging && imageZoom > 1) {
      // Add drag sensitivity control - reduce movement by dividing by zoom level
      const sensitivity = 1 / imageZoom;
      setImagePan({
        x: (e.clientX - dragStart.x) * sensitivity,
        y: (e.clientY - dragStart.y) * sensitivity
      });
    }
  };

  const handleImageMouseUp = () => {
    setIsDragging(false);
  };

  // Reset pan position when zoom changes
  const handleZoomChange = (newZoom: number) => {
    setImageZoom(newZoom);
    // Reset pan position when zoom returns to 100% or below
    if (newZoom <= 1) {
      setImagePan({ x: 0, y: 0 });
    }
  };

  const getStatusBadge = (status: ExcuseStatus) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="flex-1 space-y-4 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Excuse Applications</h1>
          <p className="text-muted-foreground">
            Review and manage student excuse applications for absences
          </p>
        </div>
        <Button 
          className="bg-gradient-primary shadow-glow h-9"
          onClick={() => setIsFormOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Application
        </Button>
      </div>

      {/* Filter and Search Section */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Select defaultValue="all" onValueChange={(value) => {
            // Filter logic would go here
          }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search applications..."
            className="pl-10"
            onChange={(e) => {
              // Search logic would go here
            }}
          />
        </div>
      </div>

      {/* Applications Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : excuses.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {excuses.map((excuse) => (
            <Card key={excuse.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold text-gray-900 truncate">
                      {excuse.students?.firstname} {excuse.students?.surname}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {excuse.students?.student_id} • {excuse.students?.program}
                    </p>
                  </div>
                  <div className="ml-2">
                    {getStatusBadge(excuse.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                    {format(new Date(excuse.absence_date), 'MMM d, yyyy')}
                  </div>
                  
                  {excuse.documentation_url && (
                    <div className="flex items-center text-sm text-gray-600">
                      <FileText className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="truncate">Documentation attached</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    Submitted {format(new Date(excuse.created_at), 'MMM d, yyyy')}
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8"
                      onClick={() => {
                        setSelectedExcuse(excuse);
                        setViewMode('view');
                        setIsViewOpen(true);
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8"
                      onClick={() => {
                        setSelectedExcuse(excuse);
                        setViewMode('edit');
                        setIsEditMode(true);
                        setFormData({
                          student_id: excuse.student_id?.toString() || '',
                          session_id: excuse.session_id?.toString() || '',
                          absence_date: excuse.absence_date || '',
                          documentation_url: excuse.documentation_url || ''
                        });
                        setIsFormOpen(true);
                      }}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setDeleteTarget(excuse.id);
                        setShowDeleteConfirm(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <div className="flex flex-col items-center">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No excuse applications</h3>
            <p className="text-gray-500 mb-4">Get started by creating a new excuse application.</p>
            <Button 
              onClick={() => setIsFormOpen(true)}
              className="bg-gradient-primary shadow-glow"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Application
            </Button>
          </div>
        </Card>
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) {
          setIsEditMode(false);
          setSelectedExcuse(null);
          setFormData({ 
            student_id: '', 
            session_id: '',
            absence_date: '',
            documentation_url: ''
          });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Excuse Application' : 'New Excuse Application'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update the excuse application details.' : 'Submit a new excuse application for a student absence.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="student">Student</Label>
              <Popover open={openStudentSelect} onOpenChange={setOpenStudentSelect}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openStudentSelect}
                    className="w-full justify-between"
                  >
                    {formData.student_id
                      ? students.find((student) => student.id.toString() === formData.student_id)?.firstname + ' ' + students.find((student) => student.id.toString() === formData.student_id)?.surname + ' (' + students.find((student) => student.id.toString() === formData.student_id)?.student_id + ')'
                      : "Select student..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 z-[100]">
                  <Command>
                    <CommandInput placeholder="Search students..." />
                    <CommandEmpty>No student found.</CommandEmpty>
                    <CommandGroup>
                      {students.map((student) => (
                        <CommandItem
                          key={student.id}
                          onSelect={() => {
                            setFormData(prev => ({ ...prev, student_id: student.id.toString() }));
                            setOpenStudentSelect(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.student_id === student.id.toString() ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {student.firstname} {student.surname} ({student.student_id})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="session">Session *</Label>
              <Popover open={openSessionSelect} onOpenChange={setOpenSessionSelect}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openSessionSelect}
                    className="w-full justify-between"
                  >
                    {formData.session_id
                      ? sessions.find((session) => session.id.toString() === formData.session_id)?.title + ' - ' + format(new Date(sessions.find((session) => session.id.toString() === formData.session_id)?.date), 'MMM d, yyyy')
                      : "Select session..."}
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4 shrink-0 opacity-50" />
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 z-[100]">
                  <Command>
                    <CommandInput placeholder="Search sessions or dates..." />
                    <CommandEmpty>No session found.</CommandEmpty>
                    <CommandGroup>
                      {sessions.map((session) => (
                        <CommandItem
                          key={session.id}
                          onSelect={() => {
                            setFormData(prev => ({ ...prev, session_id: session.id.toString() }));
                            setOpenSessionSelect(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.session_id === session.id.toString() ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{session.title}</span>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(session.date), 'EEEE, MMM d, yyyy')}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>


            <div>
              <Label htmlFor="excuse-image">Handwritten Excuse Letter</Label>
              <Input
                id="excuse-image"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFormData(prev => ({ ...prev, excuse_image: file }));
                  }
                }}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Please attach a clear photo of your handwritten excuse letter
              </p>
            </div>


          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitExcuse}
              disabled={!formData.student_id || !formData.session_id || !formData.excuse_image}
            >
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={(open) => {
        setIsViewOpen(open);
        if (!open) {
          setImageZoom(1);
          setImagePan({ x: 0, y: 0 });
          setIsDragging(false);
        }
      }}>
        <DialogContent className="max-w-7xl w-full h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Excuse Application Details</DialogTitle>
          </DialogHeader>
          {selectedExcuse && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
              {/* Left side - Application details */}
              <div className="space-y-4 lg:col-span-1">
                <div>
                  <Label className="text-sm font-medium">Student</Label>
                  <p className="text-sm font-medium">
                    {selectedExcuse.students?.firstname || 'Unknown'} {selectedExcuse.students?.surname || 'Student'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedExcuse.students?.student_id || 'N/A'} • {selectedExcuse.students?.program || 'N/A'}
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedExcuse.status)}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Absence Date</Label>
                  <p className="text-sm">
                    {format(new Date(selectedExcuse.absence_date), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>

                {selectedExcuse.review_notes && (
                  <div>
                    <Label className="text-sm font-medium">Review Notes</Label>
                    <p className="text-sm whitespace-pre-wrap">{selectedExcuse.review_notes}</p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Submitted: {format(new Date(selectedExcuse.created_at), 'MMM d, yyyy h:mm a')}
                  {selectedExcuse.reviewed_at && (
                    <span className="block mt-1">
                      Reviewed: {format(new Date(selectedExcuse.reviewed_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  )}
                </div>

                {selectedExcuse.status === 'pending' && (
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => handleUpdateStatus(selectedExcuse.id, 'approved')}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleUpdateStatus(selectedExcuse.id, 'rejected')}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>

              {/* Right side - Image with zoom controls */}
              <div className="lg:col-span-2 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Excuse Letter</Label>
                  {selectedExcuse.documentation_url && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleZoomChange(Math.max(0.5, imageZoom - 0.25))}
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground">{Math.round(imageZoom * 100)}%</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleZoomChange(Math.min(3, imageZoom + 0.25))}
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleZoomChange(1)}
                        className="ml-2"
                      >
                        Reset
                      </Button>
                    </div>
                  )}
                </div>
                
                {selectedExcuse.documentation_url ? (
                  <div 
                    className="border rounded-lg overflow-hidden flex-1 bg-gray-50 relative cursor-grab active:cursor-grabbing"
                    onMouseDown={handleImageMouseDown}
                    onMouseMove={handleImageMouseMove}
                    onMouseUp={handleImageMouseUp}
                    onMouseLeave={handleImageMouseUp}
                  >
                    <img 
                      src={selectedExcuse.documentation_url} 
                      alt="Excuse letter" 
                      className="transition-transform duration-200 max-w-none object-contain w-full h-full"
                      style={{ 
                        transform: `scale(${imageZoom}) translate(${imagePan.x}px, ${imagePan.y}px)`,
                        transformOrigin: 'center center'
                      }}
                      draggable={false}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No excuse letter attached</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Excuse Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this excuse application? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteTarget && handleDeleteExcuse(deleteTarget)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

const ExcuseApplication = () => {
  return (
    <Layout>
      <ExcuseApplicationContent />
    </Layout>
  );
};

export default ExcuseApplication;