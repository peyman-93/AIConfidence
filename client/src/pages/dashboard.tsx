import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth, MOCK_FILES } from "@/lib/mock-data";
import { bookingsAPI } from "@/lib/api";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Download, 
  FileText, 
  Image as ImageIcon, 
  Calendar, 
  LogOut, 
  User as UserIcon,
  Bell,
  Clock,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Booking {
  id: string;
  user_id: string;
  calendly_event_id: string;
  scheduled_time: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const [_, setLocation] = useLocation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [calendlyConfig, setCalendlyConfig] = useState<{
    calendly_username: string | null;
    calendly_event_type: string | null;
  } | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      setLoadingBookings(true);
      const data = await bookingsAPI.getUserBookings();
      setBookings(data);
    } catch (error: any) {
      console.error("Failed to fetch bookings:", error);
      // Don't show error toast if it's just a 401 or no bookings yet
      if (error.message && !error.message.includes("401")) {
        toast.error("Failed to load bookings");
      }
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  const fetchCalendlyConfig = useCallback(async () => {
    try {
      const config = await bookingsAPI.getConfig();
      setCalendlyConfig({
        calendly_username: config.calendly_username || null,
        calendly_event_type: config.calendly_event_type && config.calendly_event_type.trim() ? config.calendly_event_type : null,
      });
    } catch (error: any) {
      console.error("Failed to fetch Calendly config:", error);
      // Silently fail - widget just won't show
      setCalendlyConfig(null);
    }
  }, []);

  // No longer needed - using iframe approach instead

  useEffect(() => {
    if (user) {
      fetchBookings();
      fetchCalendlyConfig();
    }
  }, [user, fetchBookings, fetchCalendlyConfig]);

  // Listen for Calendly booking events to refresh bookings
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Calendly sends messages when events happen
      if (event.data.event && event.data.event.indexOf('calendly') === 0) {
        if (event.data.event === 'calendly.event_scheduled') {
          // Refresh bookings list when a booking is made
          // Don't reload iframe - just refresh bookings to avoid cookie consent popup
          setTimeout(() => {
            fetchBookings();
            toast.success("Booking confirmed! Refreshing your bookings...");
          }, 2000); // Wait 2 seconds for Calendly to process
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [fetchBookings]);

  // Also refresh bookings periodically (every 30 seconds) to catch new bookings
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      fetchBookings();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [user, fetchBookings]);

  // Calendly widget loading no longer needed with iframe approach

  // Wait for auth to finish loading before checking user
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  // Gatekeeper Logic: Redirect if survey not done
  if (!user.hasCompletedSurvey) {
    setLocation("/survey");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation */}
      <header className="border-b sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold font-serif">
              A
            </div>
            <span className="font-serif font-bold text-lg hidden sm:inline-block">Ascend Coaching</span>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Bell className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3 pl-4 border-l">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <div className="h-9 w-9 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center font-medium border border-secondary-foreground/20">
                {user.name.charAt(0)}
              </div>
              <Button variant="ghost" size="icon" onClick={logout} title="Logout">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        
        {/* Welcome Section */}
        <section className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="text-3xl font-serif font-bold text-primary">Welcome, {user.name}</h1>
          <p className="text-muted-foreground max-w-2xl">
            You are on track. Your next session is waiting to be scheduled. 
            Review your resources below to prepare.
          </p>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Column (Booking) */}
          <div className="lg:col-span-2 space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            <Card className="overflow-hidden border-primary/10 shadow-md">
              <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary">
                    <Calendar className="h-5 w-5" />
                    <CardTitle className="text-lg">Schedule Your Next Session</CardTitle>
                  </div>
                  {calendlyConfig?.calendly_username && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Just refresh bookings - don't reload iframe to avoid cookie consent popup
                        fetchBookings();
                        toast.info("Bookings refreshed. Use the calendar above to book another session.");
                      }}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Refresh Bookings
                    </Button>
                  )}
                </div>
                <CardDescription>
                  Book your 1-on-1 coaching call. Payment of €100 required upon booking.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 min-h-[500px] bg-muted/10 relative">
                {calendlyConfig?.calendly_username ? (
                  <iframe
                    key={`${calendlyConfig.calendly_username}-${calendlyConfig.calendly_event_type}`} // Reload if username or event type changes
                    src={
                      (() => {
                        const baseUrl = calendlyConfig.calendly_event_type
                          ? `https://calendly.com/${calendlyConfig.calendly_username}/${calendlyConfig.calendly_event_type}`
                          : `https://calendly.com/${calendlyConfig.calendly_username}`;
                        const params = new URLSearchParams({
                          embed_domain: window.location.hostname,
                          embed_type: 'Inline',
                          email: user?.email || '', // Pre-fill user's email
                        });
                        return `${baseUrl}?${params.toString()}`;
                      })()
                    }
                    width="100%"
                    height="500"
                    frameBorder="0"
                    title="Schedule a meeting"
                    className="w-full"
                    style={{ minHeight: '500px' }}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                    <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
                      <Calendar className="h-8 w-8 opacity-50" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">Calendly Not Configured</h3>
                    <p className="max-w-sm text-sm mb-6">
                      Please configure CALENDLY_USERNAME in your backend .env file to enable booking.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bookings List - Always Show */}
            <Card className="border-primary/10 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-primary">
                      <Clock className="h-5 w-5" />
                      <CardTitle className="text-lg">Your Bookings</CardTitle>
                    </div>
                    <CardDescription>Upcoming and past coaching sessions</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetchBookings();
                      toast.success("Refreshing bookings...");
                    }}
                    disabled={loadingBookings}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingBookings ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">Loading bookings...</p>
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <p className="text-muted-foreground">No bookings yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Book your first session using the calendar above
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Future Bookings */}
                    {bookings.filter(b => new Date(b.scheduled_time) >= new Date()).length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          Upcoming Sessions
                        </h3>
                        <div className="space-y-3">
                          {bookings
                            .filter(b => new Date(b.scheduled_time) >= new Date())
                            .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime())
                            .map((booking) => {
                              const scheduledDate = new Date(booking.scheduled_time);
                              return (
                                <div
                                  key={booking.id}
                                  className="flex items-center justify-between p-4 border rounded-lg bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    {booking.status === "confirmed" ? (
                                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ) : (
                                      <Clock className="h-5 w-5 text-primary" />
                                    )}
                                    <div>
                                      <p className="font-medium text-foreground">
                                        {format(scheduledDate, "EEEE, MMMM d, yyyy")}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {format(scheduledDate, "h:mm a")} • {booking.status}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                                    Upcoming
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Past Bookings */}
                    {bookings.filter(b => new Date(b.scheduled_time) < new Date()).length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Past Sessions
                        </h3>
                        <div className="space-y-3">
                          {bookings
                            .filter(b => new Date(b.scheduled_time) < new Date())
                            .sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime())
                            .map((booking) => {
                              const scheduledDate = new Date(booking.scheduled_time);
                              return (
                                <div
                                  key={booking.id}
                                  className="flex items-center justify-between p-4 border rounded-lg bg-muted/20 opacity-75"
                                >
                                  <div className="flex items-center gap-3">
                                    {booking.status === "confirmed" ? (
                                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ) : (
                                      <Clock className="h-5 w-5 text-muted-foreground" />
                                    )}
                                    <div>
                                      <p className="font-medium text-muted-foreground">
                                        {format(scheduledDate, "EEEE, MMMM d, yyyy")}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {format(scheduledDate, "h:mm a")} • {booking.status}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-xs text-muted-foreground">Completed</span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Column (Files) */}
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            <Card className="h-full border-secondary/20 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2 text-secondary-foreground">
                  <FileText className="h-5 w-5" />
                  <CardTitle className="text-lg">My Resources</CardTitle>
                </div>
                <CardDescription>Documents shared by your coach</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>File Name</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_FILES.map((file) => (
                      <TableRow key={file.id} className="group">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            {file.type === 'pdf' ? (
                              <FileText className="h-4 w-4 text-red-500" />
                            ) : (
                              <FileText className="h-4 w-4 text-blue-500" />
                            )}
                            <div className="flex flex-col">
                              <span className="group-hover:text-primary transition-colors">{file.name}</span>
                              <span className="text-[10px] text-muted-foreground">{file.date} • {file.size}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground border-none">
              <CardHeader>
                <CardTitle className="text-lg">Need Assistance?</CardTitle>
                <CardDescription className="text-primary-foreground/80">
                  Having trouble with booking or downloads?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" className="w-full bg-white text-primary hover:bg-white/90">
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}
