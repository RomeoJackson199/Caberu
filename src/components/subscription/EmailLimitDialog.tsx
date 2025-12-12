import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, TrendingUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmailLimitDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade: () => void;
    emailsSent: number;
    emailLimit: number;
}

export function EmailLimitDialog({
    isOpen,
    onClose,
    onUpgrade,
    emailsSent,
    emailLimit
}: EmailLimitDialogProps) {
    if (!isOpen) return null;

    const percentUsed = Math.min(100, (emailsSent / emailLimit) * 100);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                >
                    <Card className="w-full max-w-md mx-4 shadow-2xl border-orange-500/20">
                        <CardHeader className="text-center pb-2 relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-2"
                                onClick={onClose}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-orange-500/10 flex items-center justify-center">
                                <Mail className="h-8 w-8 text-orange-500" />
                            </div>
                            <CardTitle className="text-2xl font-bold">Email Limit Reached</CardTitle>
                            <CardDescription className="text-base mt-2">
                                You've used all your emails for this month.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4 pt-4">
                            {/* Usage bar */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Emails sent</span>
                                    <span className="font-medium">{emailsSent.toLocaleString()} / {emailLimit.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-3">
                                    <div
                                        className="h-3 rounded-full bg-orange-500 transition-all"
                                        style={{ width: `${percentUsed}%` }}
                                    />
                                </div>
                            </div>

                            <div className="bg-muted/50 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <TrendingUp className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-medium text-sm">Upgrade your plan</p>
                                        <p className="text-xs text-muted-foreground">
                                            Get more emails per month and unlock additional features
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="flex flex-col gap-3 pt-2">
                            <Button
                                className="w-full"
                                size="lg"
                                onClick={onUpgrade}
                            >
                                <TrendingUp className="mr-2 h-4 w-4" />
                                Upgrade Plan
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full text-muted-foreground"
                                onClick={onClose}
                            >
                                Maybe Later
                            </Button>
                        </CardFooter>
                    </Card>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
