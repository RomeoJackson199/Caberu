import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { EmailLimitDialog } from '@/components/subscription/EmailLimitDialog';
import { useNavigate } from 'react-router-dom';

interface EmailLimitContextType {
    checkEmailError: (error: any) => boolean;
    showEmailLimitPopup: (emailsSent?: number, emailLimit?: number) => void;
}

const EmailLimitContext = createContext<EmailLimitContextType | null>(null);

export function EmailLimitProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [emailsSent, setEmailsSent] = useState(0);
    const [emailLimit, setEmailLimit] = useState(2000);
    const navigate = useNavigate();

    const showEmailLimitPopup = useCallback((sent?: number, limit?: number) => {
        if (sent !== undefined) setEmailsSent(sent);
        if (limit !== undefined) setEmailLimit(limit);
        setIsOpen(true);
    }, []);

    // Check if an error is an email limit error and show popup if so
    const checkEmailError = useCallback((error: any): boolean => {
        const errorMessage = error?.message || error?.error || (typeof error === 'string' ? error : '');

        if (errorMessage.includes('Email limit exceeded')) {
            // Parse the numbers from the error message
            const match = errorMessage.match(/(\d+)\/(\d+)/);
            if (match) {
                setEmailsSent(parseInt(match[1]));
                setEmailLimit(parseInt(match[2]));
            }
            setIsOpen(true);
            return true;
        }
        return false;
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
        // Return a no-op version if not wrapped in provider
        return {
            checkEmailError: () => false,
            showEmailLimitPopup: () => { },
        };
    }
    return context;
}
