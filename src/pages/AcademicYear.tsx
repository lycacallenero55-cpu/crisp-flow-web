import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, CalendarClock, Pencil, Trash2, MoreHorizontal, ChevronDown, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";

type AcademicYear = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
};

type Semester = {
  id: string;
  academic_year_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
};

type AcademicYearFormData = {
  name: string;
  start_date: string;
  end_date: string;
  description: string;
};

type SemesterFormData = {
  name: string;
  start_date: string;
  end_date: string;
  description: string;
};

const AcademicYear = () => {
  const { toast } = useToast();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<{ [key: string]: Semester[] }>({});
  const [loading, setLoading] = useState(true);
  const [expandedYear, setExpandedYear] = useState<string | null>(null);
  const [isYearFormOpen, setIsYearFormOpen] = useState(false);
  const [isSemesterFormOpen, setIsSemesterFormOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [selectedYearForSemester, setSelectedYearForSemester] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [yearFormData, setYearFormData] = useState<AcademicYearFormData>({
    name: '',
    start_date: '',
    end_date: '',
    description: '',
  });

  const [semesterFormData, setSemesterFormData] = useState<SemesterFormData>({
    name: '',
    start_date: '',
    end_date: '',
    description: '',
  });

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      setLoading(true);
      const { data: years, error: yearsError } = await supabase
        .from('academic_years')
        .select('*')
        .order('start_date', { ascending: false });

      if (yearsError) throw yearsError;

      setAcademicYears(years || []);

      // Fetch semesters for each academic year
      if (years && years.length > 0) {
        const { data: semestersData, error: semestersError } = await supabase
          .from('semesters')
          .select('*')
          .order('start_date', { ascending: true });

        if (semestersError) throw semestersError;

        // Group semesters by academic year
        const groupedSemesters: { [key: string]: Semester[] } = {};
        semestersData?.forEach((semester) => {
          if (!groupedSemesters[semester.academic_year_id]) {
            groupedSemesters[semester.academic_year_id] = [];
          }
          groupedSemesters[semester.academic_year_id].push(semester);
        });

        setSemesters(groupedSemesters);

        // Set first year as expanded by default
        if (years.length > 0) {
          setExpandedYear(years[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching academic years:', error);
      toast({
        title: "Error",
        description: "Failed to fetch academic years",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveYear = async () => {
    try {
      if (editingYear) {
        // Update existing year
        const { error } = await supabase
          .from('academic_years')
          .update({
            name: yearFormData.name,
            start_date: yearFormData.start_date,
            end_date: yearFormData.end_date,
            description: yearFormData.description,
          })
          .eq('id', editingYear.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Academic year updated successfully",
        });
      } else {
        // Create new year
        const { error } = await supabase
          .from('academic_years')
          .insert([{
            name: yearFormData.name,
            start_date: yearFormData.start_date,
            end_date: yearFormData.end_date,
            description: yearFormData.description,
            is_active: false,
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Academic year created successfully",
        });
      }

      setIsYearFormOpen(false);
      setEditingYear(null);
      setYearFormData({ name: '', start_date: '', end_date: '', description: '' });
      fetchAcademicYears();
    } catch (error) {
      console.error('Error saving academic year:', error);
      toast({
        title: "Error",
        description: "Failed to save academic year",
        variant: "destructive",
      });
    }
  };

  const handleSaveSemester = async () => {
    try {
      if (editingSemester) {
        // Update existing semester
        const { error } = await supabase
          .from('semesters')
          .update({
            name: semesterFormData.name,
            start_date: semesterFormData.start_date,
            end_date: semesterFormData.end_date,
            description: semesterFormData.description,
          })
          .eq('id', editingSemester.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Semester updated successfully",
        });
      } else {
        // Create new semester
        const { error } = await supabase
          .from('semesters')
          .insert([{
            academic_year_id: selectedYearForSemester,
            name: semesterFormData.name,
            start_date: semesterFormData.start_date,
            end_date: semesterFormData.end_date,
            description: semesterFormData.description,
            is_active: false,
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Semester created successfully",
        });
      }

      setIsSemesterFormOpen(false);
      setEditingSemester(null);
      setSelectedYearForSemester('');
      setSemesterFormData({ name: '', start_date: '', end_date: '', description: '' });
      fetchAcademicYears();
    } catch (error) {
      console.error('Error saving semester:', error);
      toast({
        title: "Error",
        description: "Failed to save semester",
        variant: "destructive",
      });
    }
  };

  const handleDeleteYear = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this academic year? This will also delete all associated semesters.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('academic_years')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Academic year deleted successfully",
      });

      fetchAcademicYears();
    } catch (error) {
      console.error('Error deleting academic year:', error);
      toast({
        title: "Error",
        description: "Failed to delete academic year",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSemester = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this semester?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('semesters')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Semester deleted successfully",
      });

      fetchAcademicYears();
    } catch (error) {
      console.error('Error deleting semester:', error);
      toast({
        title: "Error",
        description: "Failed to delete semester",
        variant: "destructive",
      });
    }
  };

  const handleSetActiveYear = async (id: string) => {
    try {
      // First, set all years to inactive
      const { error: deactivateError } = await supabase
        .from('academic_years')
        .update({ is_active: false });

      if (deactivateError) throw deactivateError;

      // Then, set the selected year to active
      const { error: activateError } = await supabase
        .from('academic_years')
        .update({ is_active: true })
        .eq('id', id);

      if (activateError) throw activateError;

      toast({
        title: "Success",
        description: "Active academic year updated",
      });

      fetchAcademicYears();
    } catch (error) {
      console.error('Error setting active year:', error);
      toast({
        title: "Error",
        description: "Failed to set active academic year",
        variant: "destructive",
      });
    }
  };

  const handleSetActiveSemester = async (id: string, academicYearId: string) => {
    try {
      // First, set all semesters in this academic year to inactive
      const { error: deactivateError } = await supabase
        .from('semesters')
        .update({ is_active: false })
        .eq('academic_year_id', academicYearId);

      if (deactivateError) throw deactivateError;

      // Then, set the selected semester to active
      const { error: activateError } = await supabase
        .from('semesters')
        .update({ is_active: true })
        .eq('id', id);

      if (activateError) throw activateError;

      toast({
        title: "Success",
        description: "Active semester updated",
      });

      fetchAcademicYears();
    } catch (error) {
      console.error('Error setting active semester:', error);
      toast({
        title: "Error",
        description: "Failed to set active semester",
        variant: "destructive",
      });
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedYear(expandedYear === id ? null : id);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const filteredYears = academicYears.filter(year =>
    year.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    year.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openYearForm = (year?: AcademicYear) => {
    if (year) {
      setEditingYear(year);
      setYearFormData({
        name: year.name,
        start_date: year.start_date,
        end_date: year.end_date,
        description: year.description || '',
      });
    } else {
      setEditingYear(null);
      setYearFormData({ name: '', start_date: '', end_date: '', description: '' });
    }
    setIsYearFormOpen(true);
  };

  const openSemesterForm = (yearId: string, semester?: Semester) => {
    setSelectedYearForSemester(yearId);
    if (semester) {
      setEditingSemester(semester);
      setSemesterFormData({
        name: semester.name,
        start_date: semester.start_date,
        end_date: semester.end_date,
        description: semester.description || '',
      });
    } else {
      setEditingSemester(null);
      setSemesterFormData({ name: '', start_date: '', end_date: '', description: '' });
    }
    setIsSemesterFormOpen(true);
  };

  return (
    <Layout>
      <div className="flex-1 space-y-4 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Academic Years</h2>
            <p className="text-muted-foreground">
              Manage academic years and their semesters for the institution
            </p>
          </div>
          <Button 
            className="bg-gradient-primary shadow-glow h-9"
            onClick={() => openYearForm()}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Academic Year
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search academic years..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Academic Year Management
                </CardTitle>
                <CardDescription>
                  View and manage all academic years and their semesters
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredYears.map((year) => (
                  <div key={year.id} className="border rounded-lg overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-4 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => toggleExpand(year.id)}
                    >
                      <div className="flex items-center space-x-4">
                        <CalendarClock className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {year.name}
                            {year.is_active && (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                Active
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(year.start_date)} - {formatDate(year.end_date)}
                          </div>
                          {year.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {year.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openYearForm(year)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Year
                            </DropdownMenuItem>
                            {!year.is_active && (
                              <DropdownMenuItem onClick={() => handleSetActiveYear(year.id)}>
                                <Calendar className="mr-2 h-4 w-4" />
                                Set as Active
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteYear(year.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Year
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(year.id);
                          }}
                        >
                          <ChevronDown 
                            className={`h-4 w-4 transition-transform ${
                              expandedYear === year.id ? 'rotate-180' : ''
                            }`} 
                          />
                        </Button>
                      </div>
                    </div>
                    
                    {expandedYear === year.id && (
                      <div className="border-t p-4">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-medium">Semesters</h4>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openSemesterForm(year.id)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Semester
                          </Button>
                        </div>
                        
                        {semesters[year.id] && semesters[year.id].length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Start Date</TableHead>
                                <TableHead>End Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {semesters[year.id].map((semester) => (
                                <TableRow key={semester.id}>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{semester.name}</div>
                                      {semester.description && (
                                        <div className="text-sm text-muted-foreground">{semester.description}</div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>{formatDate(semester.start_date)}</TableCell>
                                  <TableCell>{formatDate(semester.end_date)}</TableCell>
                                  <TableCell>
                                    {semester.is_active ? (
                                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                        Active
                                      </Badge>
                                    ) : new Date() > new Date(semester.end_date) ? (
                                      <Badge variant="outline" className="border-gray-300">
                                        Completed
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                                        Upcoming
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                          <span className="sr-only">Open menu</span>
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openSemesterForm(year.id, semester)}>
                                          <Pencil className="mr-2 h-4 w-4" />
                                          Edit Semester
                                        </DropdownMenuItem>
                                        {!semester.is_active && new Date() <= new Date(semester.end_date) && (
                                          <DropdownMenuItem 
                                            className="text-green-600"
                                            onClick={() => handleSetActiveSemester(semester.id, year.id)}
                                          >
                                            <Calendar className="mr-2 h-4 w-4" />
                                            Set as Active
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem 
                                          className="text-red-600"
                                          onClick={() => handleDeleteSemester(semester.id)}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete Semester
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <CalendarClock className="mx-auto h-12 w-12 mb-4" />
                            <h3 className="text-sm font-medium">No semesters</h3>
                            <p className="text-sm">
                              Add semesters to organize this academic year.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {filteredYears.length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No academic years found</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {searchTerm ? 'No academic years match your search.' : 'Get started by creating your first academic year.'}
                    </p>
                    {!searchTerm && (
                      <Button onClick={() => openYearForm()}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Academic Year
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Academic Year Form Dialog */}
        <Dialog open={isYearFormOpen} onOpenChange={setIsYearFormOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingYear ? 'Edit Academic Year' : 'New Academic Year'}
              </DialogTitle>
              <DialogDescription>
                {editingYear ? 'Update the academic year details.' : 'Create a new academic year for the institution.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="year-name">Name</Label>
                <Input
                  id="year-name"
                  value={yearFormData.name}
                  onChange={(e) => setYearFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., 2024-2025"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={yearFormData.start_date}
                    onChange={(e) => setYearFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={yearFormData.end_date}
                    onChange={(e) => setYearFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="year-description">Description (Optional)</Label>
                <Input
                  id="year-description"
                  value={yearFormData.description}
                  onChange={(e) => setYearFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the academic year"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsYearFormOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveYear}
                disabled={!yearFormData.name || !yearFormData.start_date || !yearFormData.end_date}
              >
                {editingYear ? 'Update' : 'Create'} Academic Year
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Semester Form Dialog */}
        <Dialog open={isSemesterFormOpen} onOpenChange={setIsSemesterFormOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingSemester ? 'Edit Semester' : 'New Semester'}
              </DialogTitle>
              <DialogDescription>
                {editingSemester ? 'Update the semester details.' : 'Create a new semester within the academic year.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="semester-name">Name</Label>
                <Select
                  value={semesterFormData.name}
                  onValueChange={(value) => setSemesterFormData(prev => ({ ...prev, name: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st Semester">1st Semester</SelectItem>
                    <SelectItem value="2nd Semester">2nd Semester</SelectItem>
                    <SelectItem value="Summer">Summer</SelectItem>
                    <SelectItem value="Intersession">Intersession</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="semester-start-date">Start Date</Label>
                  <Input
                    id="semester-start-date"
                    type="date"
                    value={semesterFormData.start_date}
                    onChange={(e) => setSemesterFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="semester-end-date">End Date</Label>
                  <Input
                    id="semester-end-date"
                    type="date"
                    value={semesterFormData.end_date}
                    onChange={(e) => setSemesterFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="semester-description">Description (Optional)</Label>
                <Input
                  id="semester-description"
                  value={semesterFormData.description}
                  onChange={(e) => setSemesterFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the semester"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSemesterFormOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveSemester}
                disabled={!semesterFormData.name || !semesterFormData.start_date || !semesterFormData.end_date}
              >
                {editingSemester ? 'Update' : 'Create'} Semester
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AcademicYear;