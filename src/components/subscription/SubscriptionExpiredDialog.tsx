import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CreditCard, LogOut, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface SubscriptionExpiredDialogProps {
    onReactivate: () => void;
    onLogout: () => void;
    planName?: string;
}

export function SubscriptionExpiredDialog({
    onReactivate,
    onLogout,
    planName = 'subscription'
}: SubscriptionExpiredDialogProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
            >
                <Card className="w-full max-w-md mx-4 shadow-2xl border-destructive/20">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className="h-8 w-8 text-destructive" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Subscription Expired</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Your {planName} has expired. Reactivate to continue using all features.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-4">
                        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-medium text-sm">Unlock all features</p>
                                    <p className="text-xs text-muted-foreground">
                                        Manage patients, appointments, and more
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <CreditCard className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-medium text-sm">Flexible billing</p>
                                    <p className="text-xs text-muted-foreground">
                                        Cancel anytime, no hidden fees
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-3 pt-2">
                        <Button
                            className="w-full"
                            size="lg"
                            onClick={onReactivate}
                        >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Reactivate Subscription
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full text-muted-foreground hover:text-destructive"
                            onClick={onLogout}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Log Out
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
