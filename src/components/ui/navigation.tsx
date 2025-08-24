import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  LayoutDashboard, 
  UserCheck, 
  Users, 
  FileText, 
  Calendar,
  GraduationCap,
  Menu,
  X,
  UserCog,
  ClipboardCheck,
  School,
  Book,
  CalendarRange,
  LogOut,
  User,
  ChevronLeft
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useMediaQuery } from "../../hooks/use-media-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useSidebar } from "@/contexts/SidebarContext";

// Persistent role cache to prevent refetching and flashing on refresh
const getCachedUserRole = (): string | null => {
  try {
    return localStorage.getItem('userRole');
  } catch {
    return null;
  }
};

const getCachedUserId = (): string | null => {
  try {
    return localStorage.getItem('userId');
  } catch {
    return null;
  }
};

const setCachedUserRole = (role: string, userId: string) => {
  try {
    localStorage.setItem('userRole', role);
    localStorage.setItem('userId', userId);
  } catch {
    // Ignore localStorage errors
  }
};

const clearCachedUserRole = () => {
  try {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
  } catch {
    // Ignore localStorage errors
  }
};

let cachedUserRole: string | null = getCachedUserRole();
let cachedUserId: string | null = getCachedUserId();

// Navigation items configuration
const getNavItems = (userRole: string = '') => [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { 
    icon: UserCheck, 
    label: "Take Attendance", 
    href: "/take-attendance",
    isActive: (path: string) => path === '/take-attendance' || path.startsWith('/take-attendance/')
  },
  { 
    icon: Calendar, 
    label: "Schedule", 
    href: "/schedule",
    isActive: (path: string) => path === '/schedule' || path.startsWith('/sessions/') 
  },
  { icon: Users, label: "Students", href: "/students" },
  { icon: FileText, label: "Records", href: "/records" },
  { 
    icon: ClipboardCheck, 
    label: "Excuse Application", 
    href: "/excuse-application",
    isActive: (path: string) => path === '/excuse-application'
  },
  { icon: CalendarRange, label: "Academic Year", href: "/academic-year" },
  ...(userRole === 'admin' ? [{ icon: UserCog, label: "Accounts", href: "/accounts" }] : []),
];

// Desktop Sidebar Navigation
interface DesktopNavigationProps {
  onLogoutClick?: () => void;
}

const DesktopNavigation = ({ onLogoutClick = () => {} }: DesktopNavigationProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [userRole, setUserRole] = useState<string>(() => {
    // Initialize with cached role if available
    return cachedUserRole || 'user';
  });
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const isInitialMount = useRef(true);
  const navItems = getNavItems(userRole);

  useEffect(() => {
    const fetchUserRole = async () => {
      // If we have cached role for the same user, don't refetch
      if (cachedUserRole && cachedUserId === user?.id) {
        setUserRole(cachedUserRole);
        return;
      }

      if (!user) {
        const defaultRole = 'user';
        setUserRole(defaultRole);
        cachedUserRole = defaultRole;
        cachedUserId = null;
        clearCachedUserRole();
        return;
      }
      
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        const role = profile.role || 'user';
        setUserRole(role);
        
        // Cache the role and user ID both in memory and localStorage
        cachedUserRole = role;
        cachedUserId = user.id;
        setCachedUserRole(role, user.id);
      } catch (error) {
        console.error('Error fetching user role:', error);
        const defaultRole = 'user';
        setUserRole(defaultRole);
        cachedUserRole = defaultRole;
        cachedUserId = user?.id || null;
        if (user?.id) {
          setCachedUserRole(defaultRole, user.id);
        } else {
          clearCachedUserRole();
        }
      }
    };

    // Only fetch role on initial mount or when user changes
    if (isInitialMount.current || cachedUserId !== user?.id) {
      fetchUserRole();
      isInitialMount.current = false;
    }
  }, [user?.id]); // Only depend on user ID, not the full user object

  const getPanelLabel = () => {
    switch (userRole) {
      case 'admin':
        return 'Admin Panel';
      case 'instructor':
        return 'Instructor Panel';
      default:
        return 'User Panel';
    }
  };

  const shouldShowItem = (item: typeof navItems[0]) => {
    // Show admin-only items only for admin users
    if (item.href === '/students' || item.href === '/academic-year') {
      return userRole === 'admin';
    }
    return true; // Show all other items
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await handleLogout();
  };

  const handleToggleSidebar = () => {
    if (!isCollapsed) {
      // Starting to collapse - instantly hide labels
      setIsCollapsing(true);
      // Start the actual collapse after a minimal delay to ensure instant fade
      setTimeout(() => {
        toggleSidebar();
        // Reset collapsing state after animation completes
        setTimeout(() => setIsCollapsing(false), 300);
      }, 50);
    } else {
      // Expanding - normal behavior
      toggleSidebar();
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        "h-full flex flex-col bg-background border-r border-sidebar-border",
        // Stage 1: Width transition - horizontal shrinking/expanding
        "transition-[width] duration-250 ease-in-out",
        isCollapsed ? "w-12" : "w-64"
      )}>
      <div className={cn(
        "flex-1",
        isCollapsed ? "px-2 pb-2" : "p-4"
      )}>
        {/* Header */}
        <div className={cn(
          "flex items-center",
          // Stage 2: Items positioning - after width change completes
          "transition-all duration-300 ease-in-out delay-200",
          isCollapsed ? "justify-center mb-0" : "gap-3 mb-8"
        )}>
                     {isCollapsed ? (
             <Tooltip>
               <TooltipTrigger asChild>
                 <div 
                   className="bg-gradient-primary flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 w-8 h-8 rounded-md"
                   onClick={handleToggleSidebar}
                 >
                   <GraduationCap className="w-6 h-6 text-primary-foreground" />
                 </div>
               </TooltipTrigger>
               <TooltipContent side="right" align="center">
                 Expand sidebar
               </TooltipContent>
             </Tooltip>
           ) : (
             <div 
               className="bg-gradient-primary flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 w-10 h-10 rounded-md"
               onClick={handleToggleSidebar}
             >
               <GraduationCap className="w-7 h-7 text-primary-foreground" />
             </div>
           )}
          <div className={cn(
            "flex-1 flex items-center overflow-hidden",
            // Stage 3: Content transition - after positioning settles, instant fade when collapsing
            isCollapsing ? "transition-opacity duration-75" : "transition-all duration-300 ease-in-out delay-250",
            isCollapsed || isCollapsing ? "opacity-0 translate-x-2 w-0" : "opacity-100 translate-x-0"
          )}>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-education-navy whitespace-nowrap">AMSUIP</h1>
              <p className="text-sm text-muted-foreground whitespace-nowrap">{getPanelLabel()}</p>
            </div>
          </div>
        </div>
        
        {/* Menu Items */}
        <div className={cn(
          isCollapsed ? "space-y-2 mb-0 mt-0" : "space-y-1.5 mb-0"
        )}>
          {/* MENU Label */}
          {!isCollapsed && (
            <div className={cn(
              // Stage 2: Labels positioning - synchronized with header
              "transition-all duration-300 ease-in-out delay-200",
              "px-3 pb-0"
            )}>
              <span className={cn(
                "font-medium text-muted-foreground/60 uppercase tracking-wider block",
                // Stage 3: Text styling - after positioning completes, instant fade when collapsing
                isCollapsing ? "transition-opacity duration-75" : "transition-all duration-300 ease-in-out delay-300",
                "text-xs opacity-100 text-left"
              )}>
                MENU
              </span>
            </div>
          )}
          
          {navItems.filter(item => item.href !== '/students' && item.href !== '/academic-year' || userRole === 'admin').map((item, index) => {
            
            const isActive = item.isActive 
              ? item.isActive(location.pathname) 
              : location.pathname === item.href;
            const Icon = item.icon;
            
            const menuItem = (
              <div
                className={cn(
                  "flex items-center cursor-pointer group relative",
                  // Stage 2: Item positioning - each with progressive delay
                  "transition-all duration-300 ease-in-out",
                  isCollapsed 
                    ? "h-8 justify-center w-6 mx-auto p-0 rounded-sm" // Larger container with smaller active background
                    : "h-9 justify-start gap-3 px-3 w-full rounded-sm", // Slightly smaller expanded items, perfect square-round
                  isActive 
                    ? isCollapsed 
                      ? "bg-gradient-primary shadow-glow text-white h-6 w-6 mx-auto rounded-sm"
                      : "bg-gradient-primary shadow-glow text-white"
                    : "hover:bg-sidebar-accent/50 hover:text-foreground"
                )}
                style={{
                  // Stage 2: Progressive delay for smooth upward movement
                  transitionDelay: isCollapsed ? `${250 + index * 30}ms` : '0ms'
                }}
              >
                  <Icon className={cn(
                    "flex-shrink-0",
                    // Icon sizes - smaller in open state, larger in collapsed state
                    isCollapsed ? "w-4 h-4" : "w-4 h-4" // Same size for consistency
                  )} />
                  
                  <span className={cn(
                    "font-medium whitespace-nowrap min-w-0",
                    // Stage 3: Text content - fades smoothly after positioning, instant fade when collapsing
                    isCollapsing ? "transition-opacity duration-75" : "transition-all duration-250 ease-in-out delay-300",
                    isCollapsed || isCollapsing
                      ? "opacity-0 translate-x-2 w-0 overflow-hidden text-xs" 
                      : "opacity-100 translate-x-0 flex-1 text-sm"
                  )}>
                    {item.label}
                  </span>
                </div>
              );

            return (
              <Link key={item.href} to={item.href} className="block">
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {menuItem}
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  menuItem
                )}
              </Link>
            );
          })}
        </div>

        {/* OTHER section - ZERO spacing above in any state */}
        <div className={cn(
          // ZERO spacing above OTHER in any state - should be IMMEDIATELY after menu items
          "mt-0",
          isCollapsed ? "space-y-1" : "space-y-1.5"
        )}>
          {/* OTHER Label */}
          {!isCollapsed && (
            <div className={cn(
              // Stage 2: Labels positioning - synchronized with menu items
              "transition-all duration-300 ease-in-out delay-200",
              "px-3 py-0"
            )}>
              <span className={cn(
                "font-medium text-muted-foreground/60 uppercase tracking-wider block",
                // Stage 3: Text styling - after positioning completes, instant fade when collapsing
                isCollapsing ? "transition-opacity duration-75" : "transition-all duration-300 ease-in-out delay-300",
                "text-xs opacity-100 text-left"
              )}>
                OTHER
              </span>
            </div>
          )}
          
          {/* Profile Item */}
          <Link to="/profile" className="block">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex items-center cursor-pointer group relative",
                      // Stage 2: Profile item positioning - after main menu items
                      "transition-all duration-300 ease-in-out delay-400",
                      isCollapsed 
                        ? "h-8 justify-center w-6 mx-auto p-0 rounded-sm" // Larger container with smaller active background
                        : "h-9 justify-start gap-3 px-3 w-full rounded-sm", // Slightly smaller expanded items, perfect square-round
                      location.pathname === '/profile'
                        ? isCollapsed 
                          ? "bg-gradient-primary shadow-glow text-white h-6 w-6 mx-auto rounded-sm"
                          : "bg-gradient-primary shadow-glow text-white"
                        : "hover:bg-sidebar-accent/50 hover:text-foreground"
                    )}
                  >
                    <User className={cn(
                      "flex-shrink-0",
                      // Icon sizes - consistent with main menu
                      isCollapsed ? "w-4 h-4" : "w-4 h-4"
                    )} />
                    <span className={cn(
                      "font-medium whitespace-nowrap min-w-0",
                      // Stage 3: Profile text - fades after positioning, instant fade when collapsing
                      isCollapsing ? "transition-opacity duration-75" : "transition-all duration-250 ease-in-out delay-450",
                      isCollapsed || isCollapsing
                        ? "opacity-0 translate-x-2 w-0 overflow-hidden text-xs" 
                        : "opacity-100 translate-x-0 flex-1 text-sm"
                    )}>
                      Profile
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" align="center">
                  Profile
                </TooltipContent>
              </Tooltip>
            ) : (
              <div
                className={cn(
                  "flex items-center cursor-pointer group relative",
                  // Stage 2: Profile item positioning - after main menu items
                  "transition-all duration-300 ease-in-out delay-400",
                  isCollapsed 
                    ? "h-8 justify-center w-6 mx-auto p-0 rounded-sm" // Larger container with smaller active background
                    : "h-9 justify-start gap-3 px-3 w-full rounded-sm", // Slightly smaller expanded items, perfect square-round
                  location.pathname === '/profile'
                    ? isCollapsed 
                      ? "bg-gradient-primary shadow-glow text-white h-6 w-6 mx-auto rounded-sm"
                      : "bg-gradient-primary shadow-glow text-white"
                    : "hover:bg-sidebar-accent/50 hover:text-foreground"
                )}
              >
                <User className={cn(
                  "flex-shrink-0",
                  // Icon sizes - consistent with main menu
                  isCollapsed ? "w-4 h-4" : "w-4 h-4"
                )} />
                <span className={cn(
                  "font-medium whitespace-nowrap min-w-0",
                  // Stage 3: Profile text - fades after positioning, instant fade when collapsing
                  isCollapsing ? "transition-opacity duration-75" : "transition-all duration-250 ease-in-out delay-450",
                  isCollapsed || isCollapsing
                    ? "opacity-0 translate-x-2 w-0 overflow-hidden text-xs" 
                    : "opacity-100 translate-x-0 flex-1 text-sm"
                )}>
                  Profile
                </span>
              </div>
            )}
          </Link>
          
          {/* Log Out Item */}
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex items-center cursor-pointer group relative",
                    // Stage 2: Logout item positioning - final item
                    "transition-all duration-300 ease-in-out delay-450",
                    isCollapsed 
                      ? "h-8 justify-center w-6 mx-auto p-0 rounded-sm" // Larger container with smaller active background
                      : "h-9 justify-start gap-3 px-3 w-full rounded-sm", // Slightly smaller expanded items, perfect square-round
                    "hover:bg-destructive/10 hover:text-destructive text-destructive/90"
                  )}
                  onClick={handleLogoutClick}
                >
                  <LogOut className={cn(
                    "flex-shrink-0",
                    // Icon sizes - consistent with main menu
                    isCollapsed ? "w-4 h-4" : "w-4 h-4"
                  )} />
                  <span className={cn(
                    "font-medium whitespace-nowrap min-w-0",
                    // Stage 3: Logout text - fades after positioning, instant fade when collapsing
                    isCollapsing ? "transition-opacity duration-75" : "transition-all duration-250 ease-in-out delay-500",
                    isCollapsed || isCollapsing
                      ? "opacity-0 translate-x-2 w-0 overflow-hidden text-xs" 
                      : "opacity-100 translate-x-0 flex-1 text-sm"
                  )}>
                    Log Out
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">
                Log Out
              </TooltipContent>
            </Tooltip>
          ) : (
            <div
              className={cn(
                "flex items-center cursor-pointer group relative",
                // Stage 2: Logout item positioning - final item
                "transition-all duration-300 ease-in-out delay-450",
                isCollapsed 
                  ? "h-8 justify-center w-6 mx-auto p-0 rounded-sm" // Larger container with smaller active background
                  : "h-9 justify-start gap-3 px-3 w-full rounded-sm", // Slightly smaller expanded items, perfect square-round
                "hover:bg-destructive/10 hover:text-destructive text-destructive/90"
              )}
              onClick={handleLogoutClick}
            >
                              <LogOut className={cn(
                  "flex-shrink-0",
                  // Icon sizes - consistent with main menu
                  isCollapsed ? "w-4 h-4" : "w-4 h-4"
                )} />
              <span className={cn(
                "font-medium whitespace-nowrap min-w-0",
                // Stage 3: Logout text - fades after positioning, instant fade when collapsing
                isCollapsing ? "transition-opacity duration-75" : "transition-all duration-250 ease-in-out delay-500",
                isCollapsed || isCollapsing
                  ? "opacity-0 translate-x-2 w-0 overflow-hidden text-xs" 
                  : "opacity-100 translate-x-0 flex-1 text-sm"
              )}>
                Log Out
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out? You will need to sign in again to access your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmLogout}>
              Log Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
};

// Mobile Sidebar Navigation (Drawer)
interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLogoutClick: () => void;
}

const MobileDrawer = ({ isOpen, onClose, onLogoutClick }: MobileDrawerProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [userRole, setUserRole] = useState<string>(() => {
    // Initialize with cached role if available
    return cachedUserRole || 'user';
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const isInitialMount = useRef(true);
  const navItems = getNavItems(userRole).filter(item => {
    // Filter out admin-only items for non-admin users
    if (['/students', '/academic-year', '/accounts'].includes(item.href)) {
      return userRole === 'admin';
    }
    return true;
  });

  useEffect(() => {
    const fetchUserRole = async () => {
      // If we have cached role for the same user, don't refetch
      if (cachedUserRole && cachedUserId === user?.id) {
        setUserRole(cachedUserRole);
        return;
      }

      if (!user) {
        const defaultRole = 'user';
        setUserRole(defaultRole);
        cachedUserRole = defaultRole;
        cachedUserId = null;
        clearCachedUserRole();
        return;
      }
      
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        const role = profile.role || 'user';
        setUserRole(role);
        
        // Cache the role and user ID both in memory and localStorage
        cachedUserRole = role;
        cachedUserId = user.id;
        setCachedUserRole(role, user.id);
      } catch (error) {
        console.error('Error fetching user role:', error);
        const defaultRole = 'user';
        setUserRole(defaultRole);
        cachedUserRole = defaultRole;
        cachedUserId = user?.id || null;
        if (user?.id) {
          setCachedUserRole(defaultRole, user.id);
        } else {
          clearCachedUserRole();
        }
      }
    };

    // Only fetch role on initial mount or when user changes
    if (isInitialMount.current || cachedUserId !== user?.id) {
      fetchUserRole();
      isInitialMount.current = false;
    }
  }, [user?.id]); // Only depend on user ID, not the full user object

  const getPanelLabel = () => {
    switch (userRole) {
      case 'admin':
        return 'Admin Panel';
      case 'instructor':
        return 'Instructor Panel';
      default:
        return 'User Panel';
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await handleLogout();
  };
  
  const [isMounted, setIsMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (isOpen) {
      // Set mounted first
      setIsMounted(true);
      // Force a reflow before starting animation
      requestAnimationFrame(() => {
        // Ensure the DOM has updated with mounted state
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      // Start closing animation
      setIsAnimating(false);
      // Wait for animation to complete before unmounting
      animationRef.current = window.setTimeout(() => {
        setIsMounted(false);
      }, 300); // Match with CSS transition duration
    }

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isOpen]);

  // Always render the component when mounted to ensure consistent animations
  if (!isMounted) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <div 
        className={`fixed inset-0 bg-black/50 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose} 
        style={{ backdropFilter: 'blur(2px)' }}
      />
      {/* Custom dialog implementation */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50 transition-opacity" 
            onClick={() => setShowLogoutConfirm(false)} 
          />
          <div className="relative z-[101] w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Confirm Logout</h2>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to log out? You will need to sign in again to access your account.
              </p>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmLogout}>
                Log Out
              </Button>
            </div>
          </div>
        </div>
      )}
      <div 
        className={`fixed inset-y-0 left-0 w-72 bg-background p-6 overflow-y-auto transform ${
          isMounted ? 'transition-transform duration-300 ease-out' : ''
        } ${isAnimating ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          willChange: 'transform',
          boxShadow: '2px 0 10px rgba(0, 0, 0, 0.1)',
          // Ensure hardware acceleration
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
          WebkitTransformStyle: 'preserve-3d'
        }}
      >
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-education-navy">AMSUIP</h1>
              <p className="text-sm text-muted-foreground">{getPanelLabel()}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="ml-2">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-1.5">
          <div className="px-4 pt-2 pb-1">
            <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
              MENU
            </span>
          </div>
          {navItems.map((item) => {
            const isActive = item.isActive 
              ? item.isActive(location.pathname) 
              : location.pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link key={item.href} to={item.href} onClick={onClose}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-10 text-sm transition-all duration-200 group relative overflow-hidden",
                    isActive 
                      ? "bg-gradient-primary shadow-glow text-white" 
                      : "hover:bg-[hsl(214,84%,56%)] hover:bg-opacity-10 hover:text-foreground"
                  )}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>

        {/* OTHER section */}
        <div className="mt-auto space-y-1">
          <div className="px-3 py-1">
            <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
              OTHER
            </span>
          </div>
          
          <Link to="/profile" onClick={onClose}>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-10 text-sm transition-all duration-200 group relative overflow-hidden hover:bg-[hsl(214,84%,56%)] hover:bg-opacity-10 hover:text-foreground"
              style={{ margin: '1px 0' }}
            >
              <User className="w-4.5 h-4.5" />
              Profile
            </Button>
          </Link>
          
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-10 text-sm transition-all duration-200 group relative overflow-hidden hover:bg-destructive/10 hover:text-destructive text-destructive/90"
            style={{ margin: '1px 0' }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowLogoutConfirm(true);
              // Don't close the menu automatically - let the dialog handle it
            }}
          >
            <LogOut className="w-4.5 h-4.5" />
            Log Out
          </Button>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out? You will need to sign in again to access your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmLogout}>
              Log Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Navigation component props
interface NavigationProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

// Main Navigation Component
const Navigation = ({ isMobileOpen = false, onMobileClose = () => {} }: NavigationProps) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      setShowLogoutConfirm(false);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      setIsLoggingOut(false);
    }
  };

  const renderContent = () => {
    if (isDesktop) {
      return <DesktopNavigation onLogoutClick={() => setShowLogoutConfirm(true)} />;
    }
    return <MobileDrawer isOpen={isMobileOpen} onClose={onMobileClose} onLogoutClick={() => {
      onMobileClose();
      setShowLogoutConfirm(true);
    }} />;
  };

  return (
    <>
      {renderContent()}
      <Dialog open={showLogoutConfirm} onOpenChange={!isLoggingOut ? setShowLogoutConfirm : undefined}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Confirm Logout</DialogTitle>
            <DialogDescription className="text-base">
              Are you sure you want to log out? You'll need to sign in again to access your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 w-full">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto h-12 sm:h-10 text-base sm:text-sm"
              onClick={() => setShowLogoutConfirm(false)}
              disabled={isLoggingOut}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="w-full sm:w-auto h-12 sm:h-10 text-base sm:text-sm font-medium"
              onClick={handleConfirmLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Logging out...' : 'Log Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Navigation;
