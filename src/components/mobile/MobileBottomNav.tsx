import { Home, Calendar, MessageCircle, User, Sparkles, Search, Plus } from "lucide-react";
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
  isCenter?: boolean;
}

interface MobileBottomNavProps {
  variant?: "default" | "patient" | "dentist";
  onSearchClick?: () => void;
  notificationCount?: number;
  onCenterAction?: () => void;
}

export function MobileBottomNav({ 
  variant = "default", 
  onSearchClick,
  notificationCount = 0,
  onCenterAction
}: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!isMobile) return null;

  const defaultItems: NavItem[] = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Search, label: "Explore", path: "/dentists" },
    { icon: Sparkles, label: "Book", path: "/book-appointment", isCenter: true },
    { icon: MessageCircle, label: "Chat", path: "/chat" },
    { icon: User, label: "Account", path: "/login" },
  ];

  const patientItems: NavItem[] = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Calendar, label: "Visits", path: "/dashboard" },
    { icon: Plus, label: "Book", path: "/book-appointment", isCenter: true },
    { icon: MessageCircle, label: "Chat", path: "/messages", badge: notificationCount },
    { icon: User, label: "Profile", path: "/account/profile" },
  ];

  const dentistItems: NavItem[] = [
    { icon: Home, label: "Home", path: "/dentist" },
    { icon: Calendar, label: "Schedule", path: "/dentist/schedule" },
    { icon: Plus, label: "New", path: "/dentist/patients", isCenter: true },
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

    if (item.isCenter && onCenterAction) {
      onCenterAction();
    } else {
      navigate(item.path);
    }
    
    setTimeout(() => setActiveIndex(null), 200);
  };

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 z-50"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Gradient blur backdrop */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/98 to-background/90 backdrop-blur-xl" />
      
      {/* Top border glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="relative flex items-end justify-around px-2 pt-2 pb-2">
        {items.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const tapped = activeIndex === index;
          const isCenter = item.isCenter;

          if (isCenter) {
            return (
              <motion.button
                key={item.path}
                onClick={() => handleNavClick(item, index)}
                className="relative -mt-4"
                whileTap={{ scale: 0.9 }}
              >
                {/* Center button glow */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/30 blur-xl"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                
                {/* Center button */}
                <motion.div
                  className={cn(
                    "relative flex items-center justify-center",
                    "w-14 h-14 rounded-full",
                    "bg-gradient-to-br from-primary via-primary to-primary-dark",
                    "shadow-lg shadow-primary/30",
                    "border-4 border-background"
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
                </motion.div>
                
                {/* Label for center */}
                <span className="block text-[10px] font-semibold text-primary text-center mt-1">
                  {item.label}
                </span>
              </motion.button>
            );
          }

          return (
            <motion.button
              key={item.path}
              onClick={() => handleNavClick(item, index)}
              className={cn(
                "relative flex flex-col items-center justify-center",
                "min-w-[56px] py-1.5 px-2",
                "transition-all duration-200"
              )}
              whileTap={{ scale: 0.9 }}
            >
              {/* Active pill indicator */}
              <AnimatePresence>
                {active && (
                  <motion.div
                    className="absolute -top-1 w-8 h-1 rounded-full bg-primary"
                    layoutId="nav-pill"
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={{ opacity: 0, scaleX: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </AnimatePresence>

              {/* Icon container with subtle bg on active */}
              <motion.div
                className={cn(
                  "relative flex items-center justify-center",
                  "w-10 h-10 rounded-xl",
                  "transition-all duration-200",
                  active && "bg-primary/10"
                )}
                animate={tapped ? { scale: 0.85 } : { scale: 1 }}
              >
                <Icon 
                  className={cn(
                    "h-5 w-5 transition-all duration-200",
                    active ? "text-primary" : "text-muted-foreground"
                  )} 
                  strokeWidth={active ? 2.5 : 2}
                />
                
                {/* Notification badge */}
                {item.badge && item.badge > 0 && (
                  <motion.span
                    className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 
                               flex items-center justify-center
                               bg-destructive text-destructive-foreground 
                               text-[9px] font-bold rounded-full
                               shadow-sm"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </motion.span>
                )}
              </motion.div>

              {/* Label */}
              <span 
                className={cn(
                  "text-[10px] font-medium mt-0.5",
                  "transition-all duration-200",
                  active ? "text-primary font-semibold" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>

              {/* Tap ripple effect */}
              <AnimatePresence>
                {tapped && (
                  <motion.div
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    initial={{ opacity: 0.5, scale: 0.8 }}
                    animate={{ opacity: 0, scale: 1.2 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
      
      {/* Safe area spacer */}
      <div 
        className="bg-background" 
        style={{ height: 'env(safe-area-inset-bottom, 0px)' }} 
      />
    </motion.nav>
  );
}
