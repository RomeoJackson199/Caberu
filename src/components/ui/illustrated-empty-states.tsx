import { LucideIcon, Plus, Search, Calendar, Users, FileText, MessageSquare, Bell, Settings, Inbox, ShoppingCart, Heart, Bookmark, Image, FolderOpen, Zap, TrendingUp, Clock, Star } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// Animated illustrations using geometric shapes and icons
const IllustrationWrapper = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("relative w-40 h-40 flex items-center justify-center", className)}>
    {children}
  </div>
);

// Search illustration - magnifying glass with floating particles
const SearchIllustration = () => (
  <IllustrationWrapper>
    <motion.div
      className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    />
    {/* Floating particles */}
    {[0, 1, 2, 3].map((i) => (
      <motion.div
        key={i}
        className="absolute h-2 w-2 rounded-full bg-primary/30"
        style={{
          top: `${20 + i * 15}%`,
          left: `${10 + i * 20}%`,
        }}
        animate={{ 
          y: [0, -10, 0],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ 
          duration: 2 + i * 0.5, 
          repeat: Infinity,
          delay: i * 0.3
        }}
      />
    ))}
    <div className="relative z-10 h-20 w-20 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-lg">
      <Search className="h-10 w-10 text-muted-foreground" />
    </div>
  </IllustrationWrapper>
);

// Calendar illustration - calendar with floating date cards
const CalendarIllustration = () => (
  <IllustrationWrapper>
    <motion.div
      className="absolute top-4 right-4 h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center"
      animate={{ y: [0, -5, 0], rotate: [0, 5, 0] }}
      transition={{ duration: 3, repeat: Infinity, delay: 0.2 }}
    >
      <span className="text-xs font-bold text-primary">15</span>
    </motion.div>
    <motion.div
      className="absolute bottom-6 left-2 h-6 w-6 rounded bg-accent/20 flex items-center justify-center"
      animate={{ y: [0, -5, 0], rotate: [0, -5, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
    >
      <span className="text-2xs font-bold text-accent">22</span>
    </motion.div>
    <div className="relative z-10 h-24 w-20 rounded-xl bg-gradient-to-br from-card to-muted border border-border shadow-lg overflow-hidden">
      <div className="h-6 bg-primary flex items-center justify-center">
        <span className="text-2xs font-semibold text-primary-foreground">DEC</span>
      </div>
      <div className="flex items-center justify-center h-[calc(100%-1.5rem)]">
        <Calendar className="h-8 w-8 text-muted-foreground" />
      </div>
    </div>
  </IllustrationWrapper>
);

// Users illustration - overlapping avatars
const UsersIllustration = () => (
  <IllustrationWrapper>
    <motion.div
      className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-primary/10 rounded-full"
      animate={{ scale: [1, 1.03, 1] }}
      transition={{ duration: 4, repeat: Infinity }}
    />
    <div className="relative flex items-center justify-center">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn(
            "h-12 w-12 rounded-full border-2 border-background shadow-md flex items-center justify-center",
            i === 0 && "bg-primary/80 z-30",
            i === 1 && "bg-secondary/80 z-20 -ml-4",
            i === 2 && "bg-accent/80 z-10 -ml-4"
          )}
          initial={{ scale: 0, x: -20 }}
          animate={{ scale: 1, x: 0 }}
          transition={{ delay: i * 0.15, type: "spring", stiffness: 300 }}
        >
          <Users className="h-5 w-5 text-white" />
        </motion.div>
      ))}
    </div>
  </IllustrationWrapper>
);

// Documents illustration - stacked papers
const DocumentsIllustration = () => (
  <IllustrationWrapper>
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className={cn(
          "absolute h-24 w-20 rounded-lg bg-card border border-border shadow-md",
          i === 0 && "z-30",
          i === 1 && "z-20 translate-x-2 translate-y-2",
          i === 2 && "z-10 translate-x-4 translate-y-4"
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.1 }}
      >
        <div className="p-3 space-y-2">
          <div className="h-2 w-12 bg-muted rounded" />
          <div className="h-2 w-8 bg-muted rounded" />
          <div className="h-2 w-10 bg-muted rounded" />
        </div>
      </motion.div>
    ))}
    <motion.div
      className="absolute z-40 top-0 right-4"
      animate={{ rotate: [0, 10, -10, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <FileText className="h-6 w-6 text-primary" />
    </motion.div>
  </IllustrationWrapper>
);

// Messages illustration - chat bubbles
const MessagesIllustration = () => (
  <IllustrationWrapper>
    <motion.div
      className="absolute top-4 left-4 px-4 py-2 rounded-2xl rounded-bl-none bg-primary text-primary-foreground shadow-md"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-primary-foreground/80"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
    <motion.div
      className="absolute bottom-8 right-4 px-4 py-2 rounded-2xl rounded-br-none bg-muted shadow-md"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.4 }}
    >
      <MessageSquare className="h-5 w-5 text-muted-foreground" />
    </motion.div>
    <div className="relative z-10 h-16 w-16 rounded-full bg-gradient-to-br from-muted to-card flex items-center justify-center shadow-lg">
      <Inbox className="h-8 w-8 text-muted-foreground" />
    </div>
  </IllustrationWrapper>
);

// Notifications illustration - bell with badge
const NotificationsIllustration = () => (
  <IllustrationWrapper>
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      animate={{ rotate: [0, 5, -5, 0] }}
      transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
    >
      <div className="relative">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-lg">
          <Bell className="h-10 w-10 text-muted-foreground" />
        </div>
        <motion.div
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <span className="text-2xs font-bold text-white">0</span>
        </motion.div>
      </div>
    </motion.div>
  </IllustrationWrapper>
);

// Cart illustration - shopping cart
const CartIllustration = () => (
  <IllustrationWrapper>
    <motion.div
      className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl"
      animate={{ scale: [1, 1.02, 1] }}
      transition={{ duration: 3, repeat: Infinity }}
    />
    <motion.div
      className="absolute top-8 right-8 h-4 w-4 rounded-full bg-primary/30"
      animate={{ y: [0, 30], opacity: [1, 0] }}
      transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
    />
    <div className="relative z-10 h-20 w-20 rounded-2xl bg-gradient-to-br from-muted to-card flex items-center justify-center shadow-lg">
      <ShoppingCart className="h-10 w-10 text-muted-foreground" />
    </div>
  </IllustrationWrapper>
);

// Favorites illustration - heart
const FavoritesIllustration = () => (
  <IllustrationWrapper>
    <motion.div
      className="relative"
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-danger-100 to-danger-300/30 flex items-center justify-center shadow-lg">
        <Heart className="h-10 w-10 text-danger-600" />
      </div>
    </motion.div>
    {/* Floating hearts */}
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="absolute"
        style={{ top: `${30 + i * 10}%`, left: `${20 + i * 25}%` }}
        animate={{ 
          y: [0, -20, 0],
          opacity: [0.3, 0.6, 0.3],
          scale: [0.5, 0.7, 0.5]
        }}
        transition={{ duration: 2 + i, repeat: Infinity, delay: i * 0.3 }}
      >
        <Heart className="h-4 w-4 text-danger-300" />
      </motion.div>
    ))}
  </IllustrationWrapper>
);

// Bookmarks illustration
const BookmarksIllustration = () => (
  <IllustrationWrapper>
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn(
            "absolute h-16 w-12 rounded-t-lg bg-gradient-to-b shadow-md",
            i === 0 && "from-primary/80 to-primary z-30",
            i === 1 && "from-secondary/80 to-secondary z-20 translate-x-4 -translate-y-2",
            i === 2 && "from-accent/80 to-accent z-10 -translate-x-4 -translate-y-2"
          )}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: i * 0.1 }}
        >
          <Bookmark className="h-4 w-4 text-white m-auto mt-4" />
        </motion.div>
      ))}
    </motion.div>
  </IllustrationWrapper>
);

// Analytics/Stats illustration
const AnalyticsIllustration = () => (
  <IllustrationWrapper>
    <div className="flex items-end gap-2 h-24">
      {[40, 70, 55, 85, 45].map((height, i) => (
        <motion.div
          key={i}
          className="w-6 rounded-t-lg bg-gradient-to-t from-primary to-primary/60"
          initial={{ height: 0 }}
          animate={{ height: `${height}%` }}
          transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
        />
      ))}
    </div>
    <motion.div
      className="absolute top-4 right-4"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <TrendingUp className="h-6 w-6 text-success-600" />
    </motion.div>
  </IllustrationWrapper>
);

// Illustration registry
const illustrations = {
  search: SearchIllustration,
  calendar: CalendarIllustration,
  users: UsersIllustration,
  documents: DocumentsIllustration,
  messages: MessagesIllustration,
  notifications: NotificationsIllustration,
  cart: CartIllustration,
  favorites: FavoritesIllustration,
  bookmarks: BookmarksIllustration,
  analytics: AnalyticsIllustration,
};

export type IllustrationType = keyof typeof illustrations;

interface IllustratedEmptyStateProps {
  illustration: IllustrationType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function IllustratedEmptyState({
  illustration,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: IllustratedEmptyStateProps) {
  const Illustration = illustrations[illustration];

  return (
    <motion.div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Illustration />
      
      <motion.h3
        className="text-xl font-bold text-foreground mt-6 mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {title}
      </motion.h3>
      
      <motion.p
        className="text-muted-foreground max-w-md mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {description}
      </motion.p>

      <motion.div
        className="flex flex-wrap gap-3 justify-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {actionLabel && onAction && (
          <Button
            onClick={onAction}
            className="shadow-lg hover:shadow-xl transition-shadow"
          >
            <Plus className="h-4 w-4 mr-2" />
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button
            variant="outline"
            onClick={onSecondaryAction}
          >
            {secondaryActionLabel}
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}

// Quick preset empty states
export const EmptyStatePresets = {
  noResults: (onClear?: () => void) => (
    <IllustratedEmptyState
      illustration="search"
      title="No results found"
      description="We couldn't find anything matching your search. Try different keywords or filters."
      actionLabel={onClear ? "Clear search" : undefined}
      onAction={onClear}
    />
  ),
  
  noAppointments: (onCreate?: () => void) => (
    <IllustratedEmptyState
      illustration="calendar"
      title="No appointments yet"
      description="Your calendar is empty. Schedule your first appointment to get started."
      actionLabel="Schedule appointment"
      onAction={onCreate}
    />
  ),
  
  noPatients: (onAdd?: () => void) => (
    <IllustratedEmptyState
      illustration="users"
      title="No patients yet"
      description="Start building your patient list by adding your first patient."
      actionLabel="Add patient"
      onAction={onAdd}
    />
  ),
  
  noDocuments: (onUpload?: () => void) => (
    <IllustratedEmptyState
      illustration="documents"
      title="No documents"
      description="Upload documents to keep track of important files and records."
      actionLabel="Upload document"
      onAction={onUpload}
    />
  ),
  
  noMessages: () => (
    <IllustratedEmptyState
      illustration="messages"
      title="No messages"
      description="Your inbox is empty. Messages from patients and staff will appear here."
    />
  ),
  
  noNotifications: () => (
    <IllustratedEmptyState
      illustration="notifications"
      title="All caught up!"
      description="You have no new notifications. We'll let you know when something important happens."
    />
  ),
};
