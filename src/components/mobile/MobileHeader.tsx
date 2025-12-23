import { ArrowLeft, Search, Bell, Menu, MoreVertical, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  showNotifications?: boolean;
  notificationCount?: number;
  onNotificationClick?: () => void;
  showMenu?: boolean;
  onMenuClick?: () => void;
  actions?: React.ReactNode;
  className?: string;
  variant?: "default" | "transparent" | "blur";
}

export function MobileHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  showSearch = false,
  onSearch,
  showNotifications = false,
  notificationCount = 0,
  onNotificationClick,
  showMenu = false,
  onMenuClick,
  actions,
  className,
  variant = "default",
}: MobileHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const variantStyles = {
    default: "bg-background border-b border-border",
    transparent: "bg-transparent",
    blur: "bg-background/80 backdrop-blur-lg border-b border-border/50",
  };

  return (
    <motion.header
      className={cn(
        "sticky top-0 z-40 px-4 py-3",
        "safe-area-inset-top",
        variantStyles[variant],
        className
      )}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence mode="wait">
        {isSearchOpen ? (
          <motion.form
            key="search"
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onSubmit={handleSearchSubmit}
          >
            <motion.button
              type="button"
              className="p-2 -ml-2 rounded-full hover:bg-muted"
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery("");
              }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="h-5 w-5" />
            </motion.button>
            
            <input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-10 px-4 bg-muted/50 border-0 rounded-full 
                         text-sm placeholder:text-muted-foreground
                         focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          </motion.form>
        ) : (
          <motion.div
            key="header"
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Back button or Menu */}
            {showBack ? (
              <motion.button
                className="p-2 -ml-2 rounded-full hover:bg-muted"
                onClick={handleBack}
                whileTap={{ scale: 0.9 }}
              >
                <ArrowLeft className="h-5 w-5" />
              </motion.button>
            ) : showMenu ? (
              <motion.button
                className="p-2 -ml-2 rounded-full hover:bg-muted"
                onClick={onMenuClick}
                whileTap={{ scale: 0.9 }}
              >
                <Menu className="h-5 w-5" />
              </motion.button>
            ) : null}

            {/* Title */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold truncate">{title}</h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {showSearch && (
                <motion.button
                  className="p-2 rounded-full hover:bg-muted"
                  onClick={() => setIsSearchOpen(true)}
                  whileTap={{ scale: 0.9 }}
                >
                  <Search className="h-5 w-5" />
                </motion.button>
              )}

              {showNotifications && (
                <motion.button
                  className="relative p-2 rounded-full hover:bg-muted"
                  onClick={onNotificationClick}
                  whileTap={{ scale: 0.9 }}
                >
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <motion.span
                      className="absolute top-1 right-1 h-4 min-w-4 px-1
                                 flex items-center justify-center
                                 bg-destructive text-destructive-foreground
                                 text-[10px] font-bold rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </motion.span>
                  )}
                </motion.button>
              )}

              {actions}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
