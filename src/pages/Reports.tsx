import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { FileDown, Printer } from "lucide-react";

const mockSessions = Array.from({ length: 12 }).map((_, i) => ({
  id: i + 1,
  date: `2025-08-${(i + 1).toString().padStart(2, '0')}`,
  time: "09:00 - 10:30",
  title: `Session ${i + 1}`,
  type: i % 3 === 0 ? "event" : i % 2 === 0 ? "other" : "class",
  program: i % 2 === 0 ? "BSIT" : "BSBA",
  year: ["1st", "2nd", "3rd", "4th"][i % 4],
  section: ["A", "B", "C"][i % 3],
  enrolled: 40 + (i % 10),
  present: 35 + (i % 5),
  late: i % 4,
  excused: i % 3,
  absent: 5 - (i % 5),
  notes: i % 5 === 0 ? "Lab moved to Room 203" : "",
}));

const mockRecords = Array.from({ length: 60 }).map((_, i) => ({
  id: i + 1,
  studentId: `2024-${1000 + i}`,
  studentName: `Student ${i + 1}`,
  program: i % 2 === 0 ? "BSIT" : "BSBA",
  year: ["1st", "2nd", "3rd", "4th"][i % 4],
  section: ["A", "B", "C"][i % 3],
  sessionTitle: `Session ${1 + (i % 12)}`,
  date: `2025-08-${(1 + (i % 12)).toString().padStart(2, '0')}`,
  status: ["Present", "Late", "Excused", "Absent"][i % 4],
  markedAt: `2025-08-${(1 + (i % 12)).toString().padStart(2, '0')} 10:${(i % 60).toString().padStart(2, '0')}`,
  reason: i % 7 === 0 ? "Medical" : "",
}));

const unique = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

const Reports = () => {
  const [tab, setTab] = useState<'sessions' | 'records'>('sessions');
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [program, setProgram] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const [section, setSection] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [studentQuery, setStudentQuery] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");

  const filteredSessions = useMemo(() => {
    return mockSessions.filter(s => {
      const inDate = (!dateFrom || s.date >= dateFrom) && (!dateTo || s.date <= dateTo);
      const matchProgram = program === 'all' || s.program === program;
      const matchYear = year === 'all' || s.year === year;
      const matchSection = section === 'all' || s.section === section;
      const matchType = type === 'all' || s.type === type;
      const matchKeyword = !keyword || `${s.title} ${s.notes}`.toLowerCase().includes(keyword.toLowerCase());
      return inDate && matchProgram && matchYear && matchSection && matchType && matchKeyword;
    });
  }, [dateFrom, dateTo, program, year, section, type, keyword]);

  const filteredRecords = useMemo(() => {
    return mockRecords.filter(r => {
      const inDate = (!dateFrom || r.date >= dateFrom) && (!dateTo || r.date <= dateTo);
      const matchProgram = program === 'all' || r.program === program;
      const matchYear = year === 'all' || r.year === year;
      const matchSection = section === 'all' || r.section === section;
      const matchType = type === 'all' || true; // mock sessions types not linked per-record
      const matchStatus = status === 'all' || r.status === status;
      const matchStudent = !studentQuery || `${r.studentId} ${r.studentName}`.toLowerCase().includes(studentQuery.toLowerCase());
      return inDate && matchProgram && matchYear && matchSection && matchType && matchStatus && matchStudent;
    });
  }, [dateFrom, dateTo, program, year, section, type, status, studentQuery]);

  const programs = unique(mockSessions.map(s => s.program));
  const years = unique(mockSessions.map(s => s.year));
  const sections = unique(mockSessions.map(s => s.section));

  return (
    <div className="px-6 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-education-navy">Generate Reports</h1>
          <p className="text-sm text-muted-foreground">Filter attendance data and export or print.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print / PDF
          </Button>
          <Button variant="default" onClick={() => {/* placeholder export */}}>
            <FileDown className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="space-y-1">
            <Label>Date from</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Date to</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Program</Label>
            <Select value={program} onValueChange={setProgram}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {programs.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {years.map(y => (<SelectItem key={y} value={y}>{y}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Section</Label>
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {sections.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Session Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="class">Class</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {tab === 'records' && (
            <>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Present">Present</SelectItem>
                    <SelectItem value="Late">Late</SelectItem>
                    <SelectItem value="Excused">Excused</SelectItem>
                    <SelectItem value="Absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-2 lg:col-span-2">
                <Label>Student</Label>
                <Input placeholder="Search by ID or name" value={studentQuery} onChange={e => setStudentQuery(e.target.value)} />
              </div>
            </>
          )}
          <div className="space-y-1 md:col-span-2 lg:col-span-2">
            <Label>Keyword</Label>
            <Input placeholder="Search in title/notes" value={keyword} onChange={e => setKeyword(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="sessions">Completed Sessions</TabsTrigger>
          <TabsTrigger value="records">Attendance Records</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-3">
          <Card>
            <CardContent className="p-0 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-2">Date</th>
                    <th className="text-left px-4 py-2">Time</th>
                    <th className="text-left px-4 py-2">Title</th>
                    <th className="text-left px-4 py-2">Type</th>
                    <th className="text-left px-4 py-2">Program</th>
                    <th className="text-left px-4 py-2">Year</th>
                    <th className="text-left px-4 py-2">Section</th>
                    <th className="text-right px-4 py-2">Enrolled</th>
                    <th className="text-right px-4 py-2">Present</th>
                    <th className="text-right px-4 py-2">Late</th>
                    <th className="text-right px-4 py-2">Excused</th>
                    <th className="text-right px-4 py-2">Absent</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map(s => (
                    <tr key={s.id} className="border-t">
                      <td className="px-4 py-2">{s.date}</td>
                      <td className="px-4 py-2">{s.time}</td>
                      <td className="px-4 py-2">{s.title}</td>
                      <td className="px-4 py-2">{s.type}</td>
                      <td className="px-4 py-2">{s.program}</td>
                      <td className="px-4 py-2">{s.year}</td>
                      <td className="px-4 py-2">{s.section}</td>
                      <td className="px-4 py-2 text-right">{s.enrolled}</td>
                      <td className="px-4 py-2 text-right">{s.present}</td>
                      <td className="px-4 py-2 text-right">{s.late}</td>
                      <td className="px-4 py-2 text-right">{s.excused}</td>
                      <td className="px-4 py-2 text-right">{s.absent}</td>
                    </tr>
                  ))}
                  {filteredSessions.length === 0 && (
                    <tr><td colSpan={12} className="px-4 py-8 text-center text-muted-foreground">No sessions match the current filters.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records" className="mt-3">
          <Card>
            <CardContent className="p-0 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-2">Student ID</th>
                    <th className="text-left px-4 py-2">Student Name</th>
                    <th className="text-left px-4 py-2">Program</th>
                    <th className="text-left px-4 py-2">Year</th>
                    <th className="text-left px-4 py-2">Section</th>
                    <th className="text-left px-4 py-2">Session Title</th>
                    <th className="text-left px-4 py-2">Date</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="text-left px-4 py-2">Marked At</th>
                    <th className="text-left px-4 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(r => (
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-2">{r.studentId}</td>
                      <td className="px-4 py-2">{r.studentName}</td>
                      <td className="px-4 py-2">{r.program}</td>
                      <td className="px-4 py-2">{r.year}</td>
                      <td className="px-4 py-2">{r.section}</td>
                      <td className="px-4 py-2">{r.sessionTitle}</td>
                      <td className="px-4 py-2">{r.date}</td>
                      <td className="px-4 py-2">{r.status}</td>
                      <td className="px-4 py-2">{r.markedAt}</td>
                      <td className="px-4 py-2">{r.reason}</td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No records match the current filters.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;