import { Home, Calendar, MessageCircle, User, Menu, Search, Bell } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: number;
}

interface MobileBottomNavProps {
  variant?: "default" | "patient" | "dentist";
  onSearchClick?: () => void;
  notificationCount?: number;
}

export function MobileBottomNav({ 
  variant = "default", 
  onSearchClick,
  notificationCount = 0 
}: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!isMobile) return null;

  const defaultItems: NavItem[] = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Calendar, label: "Book", path: "/book-appointment" },
    { icon: MessageCircle, label: "Chat", path: "/chat" },
    { icon: User, label: "Account", path: "/login" },
  ];

  const patientItems: NavItem[] = [
    { icon: Home, label: "Home", path: "/care" },
    { icon: Calendar, label: "Appointments", path: "/care/appointments" },
    { icon: MessageCircle, label: "Messages", path: "/messages" },
    { icon: Bell, label: "Alerts", path: "/care", badge: notificationCount },
    { icon: User, label: "Profile", path: "/account/profile" },
  ];

  const dentistItems: NavItem[] = [
    { icon: Home, label: "Dashboard", path: "/dentist" },
    { icon: Calendar, label: "Schedule", path: "/dentist/schedule" },
    { icon: MessageCircle, label: "Messages", path: "/messages" },
    { icon: User, label: "Settings", path: "/dentist/settings" },
  ];

  const items = variant === "patient" ? patientItems : variant === "dentist" ? dentistItems : defaultItems;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (item: NavItem, index: number) => {
    setActiveIndex(index);
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    
    navigate(item.path);
    
    setTimeout(() => setActiveIndex(null), 200);
  };

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 z-50 mobile-nav"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="flex items-center justify-around px-2 py-1">
        {items.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const tapped = activeIndex === index;

          return (
            <motion.button
              key={item.path}
              onClick={() => handleNavClick(item, index)}
              className={cn(
                "relative flex flex-col items-center justify-center",
                "min-w-[64px] py-2 px-3 rounded-2xl",
                "transition-all duration-200",
                active ? "text-primary" : "text-muted-foreground"
              )}
              whileTap={{ scale: 0.9 }}
              animate={tapped ? { scale: 0.9 } : { scale: 1 }}
            >
              {/* Active indicator background */}
              <AnimatePresence>
                {active && (
                  <motion.div
                    className="absolute inset-0 bg-primary/10 rounded-2xl"
                    layoutId="nav-indicator"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </AnimatePresence>

              {/* Icon with badge */}
              <div className="relative z-10">
                <Icon 
                  className={cn(
                    "h-5 w-5 transition-all duration-200",
                    active && "scale-110"
                  )} 
                  strokeWidth={active ? 2.5 : 2}
                />
                
                {/* Notification badge */}
                {item.badge && item.badge > 0 && (
                  <motion.span
                    className="absolute -top-1 -right-1 h-4 min-w-4 px-1 
                               flex items-center justify-center
                               bg-destructive text-destructive-foreground 
                               text-[10px] font-bold rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </motion.span>
                )}
              </div>

              {/* Label */}
              <span 
                className={cn(
                  "relative z-10 text-[10px] font-medium mt-1",
                  "transition-all duration-200",
                  active && "font-semibold"
                )}
              >
                {item.label}
              </span>

              {/* Tap ripple effect */}
              <AnimatePresence>
                {tapped && (
                  <motion.div
                    className="absolute inset-0 bg-primary/20 rounded-2xl"
                    initial={{ opacity: 0.5, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.5 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  />
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
      
      {/* Safe area spacer */}
      <div className="h-safe-area-inset-bottom" />
    </motion.nav>
  );
}
