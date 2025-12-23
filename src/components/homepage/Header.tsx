import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { useNavigate, Link } from "react-router-dom";
import { Menu, X, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";

interface HeaderProps {
  user: User | null;
  minimal?: boolean;
}

export const Header = ({ user, minimal = false }: HeaderProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const navigation = [
    { name: "Features", href: "/#features", icon: "✨" },
    { name: "Pricing", href: "/pricing", icon: "💎" },
    { name: "About", href: "/about", icon: "ℹ️" },
    { name: "Support", href: "/support", icon: "💬" },
  ];

  return (
    <>
      <header
        className={cn(
          "fixed top-0 w-full z-50 transition-all duration-300",
          scrolled
            ? "bg-background/80 backdrop-blur-xl border-b border-border/50 py-2"
            : "bg-transparent border-transparent py-3 md:py-4"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo - priority loading for LCP */}
            <Link to="/" className="flex items-center group relative z-10">
              <Logo
                variant="full"
                size="sm"
                priority={true}
                className="h-7 md:h-8 group-hover:scale-105 transition-transform duration-300"
              />
            </Link>

            {/* Desktop Navigation */}
            {!minimal && (
              <nav className="hidden md:flex items-center space-x-8">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors relative group"
                  >
                    {item.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full rounded-full"></span>
                  </Link>
                ))}
              </nav>
            )}

            {/* Auth Buttons */}
            <div className="flex items-center gap-2 md:gap-3">
              {!user ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/login")}
                    className="hidden sm:inline-flex text-muted-foreground hover:text-foreground font-medium"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => navigate("/signup")}
                    size={isMobile ? "sm" : "default"}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-4 md:px-6 shadow-lg hover:shadow-xl transition-all"
                  >
                    {isMobile ? "Start" : "Get Started"}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => navigate("/dashboard")}
                  size={isMobile ? "sm" : "default"}
                  className="bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-full px-4 md:px-6 shadow-lg"
                >
                  Dashboard
                </Button>
              )}

              {/* Mobile Menu Toggle */}
              {!minimal && (
                <motion.button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 text-foreground rounded-xl hover:bg-muted/50 transition-colors"
                  aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                  whileTap={{ scale: 0.9 }}
                >
                  <AnimatePresence mode="wait">
                    {isMobileMenuOpen ? (
                      <motion.div
                        key="close"
                        initial={{ rotate: -90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: 90, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <X className="h-6 w-6" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="menu"
                        initial={{ rotate: 90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: -90, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Menu className="h-6 w-6" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Full-screen Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && !minimal && (
          <motion.div
            className="fixed inset-0 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-background/95 backdrop-blur-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu Content */}
            <motion.div
              className="relative h-full flex flex-col pt-20 pb-8 px-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.1 }}
            >
              {/* Navigation Links */}
              <nav className="flex-1 space-y-2">
                {navigation.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                  >
                    <Link
                      to={item.href}
                      className="flex items-center justify-between p-4 rounded-2xl 
                                 bg-muted/30 hover:bg-muted/50
                                 transition-all active:scale-[0.98]"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="text-lg font-semibold">{item.name}</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                  </motion.div>
                ))}
              </nav>

              {/* Bottom Actions */}
              <motion.div
                className="space-y-3 pt-6 border-t border-border"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {!user ? (
                  <>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full rounded-2xl h-14 text-base font-semibold"
                      onClick={() => {
                        navigate("/login");
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Sign In
                    </Button>
                    <Button
                      size="lg"
                      className="w-full rounded-2xl h-14 text-base font-semibold 
                                 bg-gradient-to-r from-primary to-secondary"
                      onClick={() => {
                        navigate("/signup");
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <Sparkles className="h-5 w-5 mr-2" />
                      Get Started Free
                    </Button>
                  </>
                ) : (
                  <Button
                    size="lg"
                    className="w-full rounded-2xl h-14 text-base font-semibold"
                    onClick={() => {
                      navigate("/dashboard");
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    Go to Dashboard
                  </Button>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
