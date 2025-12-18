import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceKey) {
            return new Response(
                JSON.stringify({ error: 'Server configuration error' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        console.log('Starting message notification check...');

        // Get all unread messages grouped by recipient
        const { data: unreadMessages, error: msgError } = await supabase
            .from('messages')
            .select(`
                id,
                message_text,
                created_at,
                recipient_profile_id,
                sender_profile_id,
                sender:profiles!messages_sender_profile_id_fkey (
                    first_name,
                    last_name
                ),
                recipient:profiles!messages_recipient_profile_id_fkey (
                    email,
                    first_name,
                    last_name
                )
            `)
            .eq('is_read', false)
            .order('created_at', { ascending: false });

        if (msgError) {
            console.error('Error fetching unread messages:', msgError);
            return new Response(
                JSON.stringify({ error: 'Failed to fetch messages', details: msgError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!unreadMessages || unreadMessages.length === 0) {
            console.log('No unread messages found');
            return new Response(
                JSON.stringify({ success: true, message: 'No unread messages', emails_sent: 0 }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`Found ${unreadMessages.length} unread messages`);

        // Group messages by recipient
        const messagesByRecipient = new Map<string, {
            email: string;
            name: string;
            messages: Array<{
                senderName: string;
                text: string;
                date: string;
            }>;
        }>();

        for (const msg of unreadMessages) {
            const recipient = msg.recipient as any;
            const sender = msg.sender as any;
            
            if (!recipient?.email) continue;

            const recipientId = msg.recipient_profile_id;
            const senderName = sender ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() : 'Someone';
            const recipientName = recipient ? `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim() : 'User';

            if (!messagesByRecipient.has(recipientId)) {
                messagesByRecipient.set(recipientId, {
                    email: recipient.email,
                    name: recipientName || 'User',
                    messages: []
                });
            }

            messagesByRecipient.get(recipientId)!.messages.push({
                senderName,
                text: msg.message_text.substring(0, 100) + (msg.message_text.length > 100 ? '...' : ''),
                date: new Date(msg.created_at).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            });
        }

        let emailsSent = 0;
        const errors: string[] = [];

        // Send notification email to each recipient
        for (const [recipientId, data] of messagesByRecipient) {
            const messageCount = data.messages.length;
            const subject = `📬 You have ${messageCount} unread message${messageCount > 1 ? 's' : ''}`;
            
            // Build message list HTML
            const messageList = data.messages.slice(0, 5).map(m => 
                `• From ${m.senderName} (${m.date}): "${m.text}"`
            ).join('\n');

            const moreMessages = messageCount > 5 ? `\n\n...and ${messageCount - 5} more message(s)` : '';

            const message = `Dear ${data.name},

You have ${messageCount} unread message${messageCount > 1 ? 's' : ''} waiting for you:

${messageList}${moreMessages}

Please log in to your account to read and respond to your messages.

Best regards,
Your Dental Clinic Team`;

            try {
                const { error: emailError } = await supabase.functions.invoke('send-email-notification', {
                    body: {
                        to: data.email,
                        subject: subject,
                        message: message,
                        messageType: 'system',
                        isSystemNotification: true,
                    },
                });

                if (!emailError) {
                    emailsSent++;
                    console.log(`Email sent to ${data.email}`);
                } else {
                    console.error(`Failed to send email to ${data.email}:`, emailError);
                    errors.push(data.email);
                }
            } catch (emailCatchError) {
                console.error(`Error invoking email function for ${data.email}:`, emailCatchError);
                errors.push(data.email);
            }
        }

        console.log(`Message notification check complete. Sent ${emailsSent} emails.`);

        return new Response(
            JSON.stringify({
                success: true,
                total_unread_messages: unreadMessages.length,
                recipients_notified: emailsSent,
                failed_emails: errors.length,
                message: `Sent ${emailsSent} notification email(s) for ${unreadMessages.length} unread message(s)`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Unexpected error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: String(error) }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
