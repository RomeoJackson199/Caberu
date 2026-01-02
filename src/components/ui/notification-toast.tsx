import { toast } from "sonner";
import { 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  XCircle,
  Calendar,
  Pill,
  FileText,
  Bell
} from "lucide-react";

export interface ToastOptions {
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const showToast = {
  success: (options: ToastOptions) => {
    toast.success(options.title, {
      description: options.description,
      duration: options.duration || 4000,
      icon: <CheckCircle className="h-4 w-4 text-dental-success" />,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      style: {
        background: 'hsl(var(--dental-success) / 0.1)',
        borderColor: 'hsl(var(--dental-success) / 0.3)',
        color: 'hsl(var(--dental-foreground))',
      },
    });
  },

  error: (options: ToastOptions) => {
    toast.error(options.title, {
      description: options.description,
      duration: options.duration || 6000,
      icon: <XCircle className="h-4 w-4 text-dental-error" />,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      style: {
        background: 'hsl(var(--dental-error) / 0.1)',
        borderColor: 'hsl(var(--dental-error) / 0.3)',
        color: 'hsl(var(--dental-foreground))',
      },
    });
  },

  warning: (options: ToastOptions) => {
    toast.warning(options.title, {
      description: options.description,
      duration: options.duration || 5000,
      icon: <AlertTriangle className="h-4 w-4 text-dental-warning" />,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      style: {
        background: 'hsl(var(--dental-warning) / 0.1)',
        borderColor: 'hsl(var(--dental-warning) / 0.3)',
        color: 'hsl(var(--dental-foreground))',
      },
    });
  },

  info: (options: ToastOptions) => {
    toast.info(options.title, {
      description: options.description,
      duration: options.duration || 4000,
      icon: <Info className="h-4 w-4 text-dental-info" />,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      style: {
        background: 'hsl(var(--dental-info) / 0.1)',
        borderColor: 'hsl(var(--dental-info) / 0.3)',
        color: 'hsl(var(--dental-foreground))',
      },
    });
  },

  appointment: (options: ToastOptions) => {
    toast.success(options.title, {
      description: options.description,
      duration: options.duration || 5000,
      icon: <Calendar className="h-4 w-4 text-dental-primary" />,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      style: {
        background: 'hsl(var(--dental-primary) / 0.1)',
        borderColor: 'hsl(var(--dental-primary) / 0.3)',
        color: 'hsl(var(--dental-foreground))',
      },
    });
  },

  prescription: (options: ToastOptions) => {
    toast.info(options.title, {
      description: options.description,
      duration: options.duration || 6000,
      icon: <Pill className="h-4 w-4 text-dental-secondary" />,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      style: {
        background: 'hsl(var(--dental-secondary) / 0.1)',
        borderColor: 'hsl(var(--dental-secondary) / 0.3)',
        color: 'hsl(var(--dental-foreground))',
      },
    });
  },

  note: (options: ToastOptions) => {
    toast.info(options.title, {
      description: options.description,
      duration: options.duration || 4000,
      icon: <FileText className="h-4 w-4 text-dental-accent" />,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      style: {
        background: 'hsl(var(--dental-accent) / 0.1)',
        borderColor: 'hsl(var(--dental-accent) / 0.3)',
        color: 'hsl(var(--dental-foreground))',
      },
    });
  },

  notification: (options: ToastOptions) => {
    toast(options.title, {
      description: options.description,
      duration: options.duration || 4000,
      icon: <Bell className="h-4 w-4 text-dental-muted-foreground" />,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      style: {
        background: 'hsl(var(--dental-muted) / 0.1)',
        borderColor: 'hsl(var(--dental-muted) / 0.3)',
        color: 'hsl(var(--dental-foreground))',
      },
    });
  },
};