import {
  Calendar,
  Users,
  FileText,
  MessageSquare,
  Pill,
  Receipt,
  Folder,
  Bell,
  Heart,
  Package,
  Image,
  CreditCard,
  CheckCircle,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

// No Appointments
export const NoAppointments = ({ onBook }: { onBook?: () => void }) => (
  <EmptyState
    icon={Calendar}
    title="No appointments yet"
    description="You don't have any upcoming appointments. Book your first appointment to get started with your dental care."
    actionLabel="Book Appointment"
    onAction={onBook}
  />
);

// No Patients
export const NoPatients = ({ onInvite }: { onInvite?: () => void }) => (
  <EmptyState
    icon={Users}
    title="No patients yet"
    description="Start growing your practice by inviting patients or waiting for new patient bookings. Your patient list will appear here."
    actionLabel="Invite Patient"
    onAction={onInvite}
  />
);

// No Medical Records
export const NoMedicalRecords = ({ onAdd }: { onAdd?: () => void }) => (
  <EmptyState
    icon={FileText}
    title="No medical records"
    description="Medical records, treatment history, and X-rays will be stored here for easy access during appointments."
    actionLabel="Add Record"
    onAction={onAdd}
  />
);

// No Messages
export const NoMessages = ({ onCompose }: { onCompose?: () => void }) => (
  <EmptyState
    icon={MessageSquare}
    title="No messages"
    description="Your inbox is empty. When patients or staff send you messages, they'll appear here."
    actionLabel="Send Message"
    onAction={onCompose}
  />
);

// No Prescriptions
export const NoPrescriptions = ({ onCreate }: { onCreate?: () => void }) => (
  <EmptyState
    icon={Pill}
    title="No prescriptions"
    description="You don't have any active prescriptions. Your dentist will create prescriptions here after your appointments."
    actionLabel="View Past Prescriptions"
    onAction={onCreate}
  />
);

// No Invoices/Bills
export const NoInvoices = () => (
  <EmptyState
    icon={Receipt}
    title="All caught up! 🎉"
    description="You have no outstanding bills or payment requests. Your payment history is available in your account."
  />
);

// No Documents
export const NoDocuments = ({ onUpload }: { onUpload?: () => void }) => (
  <EmptyState
    icon={Folder}
    title="No documents"
    description="Important documents like insurance forms, consent forms, and treatment plans will be stored here."
    actionLabel="Upload Document"
    onAction={onUpload}
  />
);

// No Notifications
export const NoNotifications = () => (
  <EmptyState
    icon={Bell}
    title="No notifications"
    description="You're all caught up! Appointment reminders and important updates will appear here."
    variant="compact"
  />
);

// No Treatment History
export const NoTreatmentHistory = () => (
  <EmptyState
    icon={Heart}
    title="No treatment history"
    description="Your treatment history will be recorded here after your dental visits. This helps track your progress and plan future care."
  />
);

// No Inventory Items (for dentists)
export const NoInventoryItems = ({ onAdd }: { onAdd?: () => void }) => (
  <EmptyState
    icon={Package}
    title="No inventory items"
    description="Track dental supplies, equipment, and materials here. Get low-stock alerts to never run out of essentials."
    actionLabel="Add Item"
    onAction={onAdd}
  />
);

// No Imaging - NEW
export const NoImaging = ({ onUpload }: { onUpload?: () => void }) => (
  <EmptyState
    icon={Image}
    title="No imaging history"
    description="X-rays, photos, and dental scans will appear here as they are uploaded. Compare images over time to track your dental health."
    actionLabel="Upload X-ray"
    onAction={onUpload}
  />
);

// No Payments - NEW
export const NoPayments = () => (
  <EmptyState
    icon={CreditCard}
    title="No payment history"
    description="Your payment history will appear here after transactions are made. All receipts are stored securely."
  />
);

// Payment Success - NEW
export const PaymentComplete = () => (
  <EmptyState
    icon={CheckCircle}
    title="All paid! ✨"
    description="You have no outstanding balances. Thank you for keeping your account up to date!"
    variant="compact"
  />
);

// Search Results Empty
export const NoSearchResults = ({ searchTerm }: { searchTerm?: string }) => (
  <EmptyState
    icon={FileText}
    title="No results found"
    description={
      searchTerm
        ? `We couldn't find anything matching "${searchTerm}". Try adjusting your search terms.`
        : "No results match your current filters. Try adjusting your search criteria."
    }
    variant="compact"
  />
);

// Generic Empty State
export const GenericEmpty = ({
  title,
  description,
  onAction,
  actionLabel,
}: {
  title: string;
  description: string;
  onAction?: () => void;
  actionLabel?: string;
}) => (
  <EmptyState
    icon={FileText}
    title={title}
    description={description}
    actionLabel={actionLabel}
    onAction={onAction}
  />
);
