import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Keyboard,
  Search,
  Home,
  Calendar,
  Users,
  FileText,
  Settings,
  LogOut,
  Plus,
  Save,
  Command,
  HelpCircle,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const shortcuts: Shortcut[] = [
  // Navigation
  {
    keys: ["Ctrl/Cmd", "K"],
    description: "Open command palette",
    category: "Navigation",
    icon: Search,
  },
  {
    keys: ["G", "H"],
    description: "Go to home/dashboard",
    category: "Navigation",
    icon: Home,
  },
  {
    keys: ["G", "A"],
    description: "Go to appointments",
    category: "Navigation",
    icon: Calendar,
  },
  {
    keys: ["G", "P"],
    description: "Go to patients",
    category: "Navigation",
    icon: Users,
  },
  {
    keys: ["G", "S"],
    description: "Go to settings",
    category: "Navigation",
    icon: Settings,
  },
  {
    keys: ["?"],
    description: "Show keyboard shortcuts",
    category: "Navigation",
    icon: HelpCircle,
  },

  // Actions
  {
    keys: ["C"],
    description: "Create new appointment",
    category: "Actions",
    icon: Plus,
  },
  {
    keys: ["N"],
    description: "Create new patient",
    category: "Actions",
    icon: Plus,
  },
  {
    keys: ["Ctrl/Cmd", "S"],
    description: "Save current form",
    category: "Actions",
    icon: Save,
  },
  {
    keys: ["Esc"],
    description: "Close modal/dialog",
    category: "Actions",
  },

  // Search & Filter
  {
    keys: ["/"],
    description: "Focus search field",
    category: "Search",
    icon: Search,
  },
  {
    keys: ["Ctrl/Cmd", "F"],
    description: "Search in current page",
    category: "Search",
    icon: Search,
  },

  // General
  {
    keys: ["Ctrl/Cmd", ","],
    description: "Open settings",
    category: "General",
    icon: Settings,
  },
  {
    keys: ["Shift", "?"],
    description: "Show help",
    category: "General",
    icon: HelpCircle,
  },
];

interface KeyboardShortcutsGuideProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function KeyboardShortcutsGuide({
  open: controlledOpen,
  onOpenChange,
}: KeyboardShortcutsGuideProps) {
  const [open, setOpen] = useState(false);
  const { roles } = useUserRole();

  // Use controlled or uncontrolled state
  const isOpen = controlledOpen !== undefined ? controlledOpen : open;
  const setIsOpen = onOpenChange || setOpen;

  // Listen for ? key to open shortcuts guide
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Open with ? key (when not in input)
      if (e.key === "?" && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsOpen(true);
      }

      // Close with Escape key
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  // Detect OS for displaying correct modifier keys
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modifierKey = isMac ? "⌘" : "Ctrl";

  const formatKey = (key: string) => {
    return key
      .replace("Ctrl/Cmd", modifierKey)
      .replace("Cmd", "⌘")
      .replace("Ctrl", isMac ? "⌃" : "Ctrl")
      .replace("Shift", "⇧")
      .replace("Alt", isMac ? "⌥" : "Alt")
      .replace("Enter", "↵")
      .replace("Esc", "Esc");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Keyboard className="w-6 h-6 text-blue-600" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate Caberu faster
          </DialogDescription>
        </DialogHeader>

        {/* Platform indicator */}
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <Command className="w-4 h-4" />
          <span>
            Shortcuts shown for{" "}
            <strong>{isMac ? "macOS" : "Windows/Linux"}</strong>
          </span>
        </div>

        {/* Shortcuts by category */}
        <div className="space-y-6">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                {category}
                <Badge variant="secondary" className="text-xs">
                  {categoryShortcuts.length}
                </Badge>
              </h3>

              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <Card
                    key={index}
                    className="p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Description */}
                      <div className="flex items-center gap-3 flex-1">
                        {shortcut.icon && (
                          <shortcut.icon className="w-4 h-4 text-gray-500 shrink-0" />
                        )}
                        <span className="text-sm text-gray-700">
                          {shortcut.description}
                        </span>
                      </div>

                      {/* Keys */}
                      <div className="flex items-center gap-1 shrink-0">
                        {shortcut.keys.map((key, keyIndex) => (
                          <div key={keyIndex} className="flex items-center gap-1">
                            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded shadow-sm min-w-[2rem] text-center">
                              {formatKey(key)}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-gray-400 text-xs">+</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer tip */}
        <div className="border-t pt-4 mt-6">
          <p className="text-sm text-gray-600 text-center">
            Press <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">?</kbd>{" "}
            to open this guide anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Floating button to trigger keyboard shortcuts guide
 * Can be placed in header/footer for easy access
 */
export function KeyboardShortcutsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium
                 text-gray-600 hover:text-gray-900 hover:bg-gray-100
                 rounded-lg transition-colors duration-200"
        aria-label="Show keyboard shortcuts"
      >
        <Keyboard className="w-4 h-4" />
        <span className="hidden sm:inline">Shortcuts</span>
      </button>

      <KeyboardShortcutsGuide open={open} onOpenChange={setOpen} />
    </>
  );
}

/**
 * Hook to access keyboard shortcuts programmatically
 */
export function useKeyboardShortcut(
  keys: string[],
  callback: () => void,
  options?: {
    enabled?: boolean;
    preventDefault?: boolean;
  }
) {
  const { enabled = true, preventDefault = true } = options || {};

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInput) return;

      // Check if all keys match
      const matchesShortcut = keys.every((key) => {
        switch (key.toLowerCase()) {
          case "ctrl":
            return e.ctrlKey;
          case "cmd":
          case "meta":
            return e.metaKey;
          case "shift":
            return e.shiftKey;
          case "alt":
            return e.altKey;
          default:
            return e.key.toLowerCase() === key.toLowerCase();
        }
      });

      if (matchesShortcut) {
        if (preventDefault) {
          e.preventDefault();
        }
        callback();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keys, callback, enabled, preventDefault]);
}

/**
 * Example usage in a component:
 *
 * ```tsx
 * import { useKeyboardShortcut } from '@/components/KeyboardShortcutsGuide';
 *
 * function MyComponent() {
 *   useKeyboardShortcut(['ctrl', 's'], () => {
 *     console.log('Save shortcut triggered');
 *     handleSave();
 *   });
 *
 *   return <div>...</div>;
 * }
 * ```
 */
