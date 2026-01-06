import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { EmailLimitDialog } from '@/components/subscription/EmailLimitDialog';
import { useNavigate } from 'react-router-dom';

interface EmailLimitContextType {
    checkEmailError: (error: unknown) => boolean;
    showEmailLimitPopup: (emailsSent?: number, emailLimit?: number) => void;
}

const EmailLimitContext = createContext<EmailLimitContextType | null>(null);

// Global function to dispatch email limit error (can be called from anywhere)
export function dispatchEmailLimitError(emailsSent: number, emailLimit: number) {
    window.dispatchEvent(new CustomEvent('email-limit-exceeded', {
        detail: { emailsSent, emailLimit }
    }));
}

// Helper to check if an error is email limit related and dispatch if so
export function handleEmailError(error: unknown): boolean {
    const err = error as { message?: string; error?: string } | string | null;
    const errorMessage = (typeof err === 'object' && err !== null)
        ? (err.message || err.error || JSON.stringify(err))
        : (typeof err === 'string' ? err : '');

    if (errorMessage.includes('Email limit exceeded')) {
        const match = errorMessage.match(/(\d+)\/(\d+)/);
        if (match) {
            dispatchEmailLimitError(parseInt(match[1]), parseInt(match[2]));
        } else {
            dispatchEmailLimitError(0, 0);
        }
        return true;
    }
    return false;
}

export function EmailLimitProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [emailsSent, setEmailsSent] = useState(0);
    const [emailLimit, setEmailLimit] = useState(2000);
    const navigate = useNavigate();

    // Listen for global email limit error events
    useEffect(() => {
        const handleEmailLimitEvent = (event: CustomEvent<{ emailsSent: number; emailLimit: number }>) => {
            setEmailsSent(event.detail.emailsSent);
            setEmailLimit(event.detail.emailLimit);
            setIsOpen(true);
        };

        window.addEventListener('email-limit-exceeded', handleEmailLimitEvent as EventListener);
        return () => {
            window.removeEventListener('email-limit-exceeded', handleEmailLimitEvent as EventListener);
        };
    }, []);

    const showEmailLimitPopup = useCallback((sent?: number, limit?: number) => {
        if (sent !== undefined) setEmailsSent(sent);
        if (limit !== undefined) setEmailLimit(limit);
        setIsOpen(true);
    }, []);

    const checkEmailError = useCallback((error: unknown): boolean => {
        return handleEmailError(error);
    }, []);

    const handleUpgrade = useCallback(() => {
        setIsOpen(false);
        navigate('/dentist/settings?tab=billing');
    }, [navigate]);

    const handleClose = useCallback(() => {
        setIsOpen(false);
    }, []);

    return (
        <EmailLimitContext.Provider value={{ checkEmailError, showEmailLimitPopup }}>
            {children}
            <EmailLimitDialog
                isOpen={isOpen}
                onClose={handleClose}
                onUpgrade={handleUpgrade}
                emailsSent={emailsSent}
                emailLimit={emailLimit}
            />
        </EmailLimitContext.Provider>
    );
}

export function useEmailLimit() {
    const context = useContext(EmailLimitContext);
    if (!context) {
        return {
            checkEmailError: handleEmailError,
            showEmailLimitPopup: () => { },
        };
    }
    return context;
}

