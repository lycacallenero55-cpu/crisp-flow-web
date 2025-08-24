import Navigation from "@/components/ui/navigation";
import { useMediaQuery } from "../hooks/use-media-query";
import { useState, useEffect } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, Menu } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

const getPanelLabel = (userRole: string) => {
  switch (userRole) {
    case 'admin':
      return 'Admin Panel';
    case 'instructor':
      return 'Instructor Panel';
    default:
      return 'User Panel';
  }
};

const Layout = ({ children }: LayoutProps) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>('user');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // This is a simplified version - you might want to fetch the actual user role
    // from your authentication context or API
    const role = user?.user_metadata?.role || 'user';
    setUserRole(role);
  }, [user]);

  useEffect(() => {
    // Prevent flash by disabling transitions on initial load
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 h-full z-40",
        isDesktop ? "hidden md:block" : "hidden",
        !isInitialLoad && "transition-[width] duration-250 ease-in-out",
        isCollapsed ? "w-12" : "w-64"
      )}>
        <Navigation />
      </div>

      {/* Mobile Header - Always visible on mobile */}
      <header className={cn(
        "fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50",
        "flex items-center justify-between px-4",
        isDesktop ? "hidden" : "flex"
      )}>
        <div className="flex items-center gap-3">
          <div className="bg-gradient-primary p-1.5 rounded-md flex-shrink-0">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <h1 className="text-lg font-bold text-education-navy">AMSUIP</h1>
            <p className="text-xs text-muted-foreground">{getPanelLabel(userRole)}</p>
          </div>
        </div>
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="h-8 w-8 p-0 flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
          aria-label="Menu"
        >
          <Menu className="h-4 w-4" />
        </button>
      </header>

      {/* Mobile Sidebar */}
      <Navigation isMobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />
      
      {/* Main Content */}
      <main className={cn(
        "flex-1 min-w-0 w-full overflow-x-hidden",
        !isInitialLoad && "transition-[margin-left] duration-250 ease-in-out",
        isDesktop 
          ? (isCollapsed ? 'ml-12' : 'ml-64')
          : 'mt-14', // Add margin for mobile header
        "px-4 py-3 md:px-6 md:py-4"
      )}>
        {children}
      </main>
    </div>
  );
};

export default Layout;