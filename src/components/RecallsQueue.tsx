import { useEffect, useState, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RecallRecord, regenerateSlots } from "@/lib/recalls";

interface RecallsQueueProps {
	dentistId: string;
}

export const RecallsQueue = memo(function RecallsQueue({ dentistId }: RecallsQueueProps) {
	const [recalls, setRecalls] = useState<RecallRecord[]>([]);
	const [status, setStatus] = useState<'all' | 'suggested' | 'snoozed' | 'declined' | 'booked'>('all');

	const load = useCallback(async () => {
		let query = supabase.from('recalls').select('*').eq('dentist_id', dentistId).order('due_date');
		if (status !== 'all') query = query.eq('status', status);
		const { data } = await query;
		setRecalls((data || []) as RecallRecord[]);
	}, [dentistId, status]);

	useEffect(() => { load(); }, [load]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Recalls</CardTitle>
				<div className="flex gap-2 mt-2">
					<Button size="sm" variant={status === 'all' ? 'default' : 'outline'} onClick={() => setStatus('all')}>All</Button>
					<Button size="sm" variant={status === 'suggested' ? 'default' : 'outline'} onClick={() => setStatus('suggested')}>Suggested</Button>
					<Button size="sm" variant={status === 'snoozed' ? 'default' : 'outline'} onClick={() => setStatus('snoozed')}>Snoozed</Button>
					<Button size="sm" variant={status === 'declined' ? 'default' : 'outline'} onClick={() => setStatus('declined')}>Declined</Button>
					<Button size="sm" variant={status === 'booked' ? 'default' : 'outline'} onClick={() => setStatus('booked')}>Booked</Button>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{recalls.map(r => (
						<div key={r.id} className="p-3 border rounded flex items-center justify-between">
							<div>
								<div className="font-medium">{r.treatment_label}</div>
								<div className="text-xs text-muted-foreground">Due {new Date(r.due_date).toLocaleDateString()}</div>
								<Badge variant="secondary" className="mt-1">{r.status}</Badge>
							</div>
							<div className="flex gap-2">
								<Button size="sm" variant="outline" onClick={async () => { await regenerateSlots(r.id); load(); }}>Regenerate slots</Button>
								<Button size="sm" variant="ghost" onClick={async () => { await supabase.from('recalls').update({ status: 'declined' }).eq('id', r.id); load(); }}>Mark declined</Button>
							</div>
						</div>
					))}
					{recalls.length === 0 && <div className="text-sm text-muted-foreground">No recalls</div>}
				</div>
			</CardContent>
		</Card>
	);
});