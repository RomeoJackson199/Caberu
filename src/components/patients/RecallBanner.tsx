import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { RecallRecord } from "@/lib/recalls";

interface RecallBannerProps {
	recall: RecallRecord;
}

export function RecallBanner({ recall }: RecallBannerProps) {
	const navigate = useNavigate();
	const first = recall.suggested_slots?.[0];
	const niceDue = new Date(recall.due_date).toLocaleDateString();
	const niceTime = first ? first.time.slice(0,5) : '';
	return (
		<Card className="border-2 border-primary/30 bg-primary/5">
			<CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
				<div>
					<div className="font-semibold">Your next {recall.treatment_label} is due on {niceDue}.</div>
					{first && <div className="text-sm text-muted-foreground">Book this {first.date} at {niceTime}?</div>}
				</div>
				<div className="flex gap-2">
					<Button onClick={() => navigate(`/recalls/${recall.id}`)}>Book suggested slot</Button>
					<Button variant="outline" onClick={() => navigate('/dashboard#appointments')}>See other times</Button>
					<Button variant="ghost" onClick={() => navigate(`/recalls/${recall.id}`)}>Remind me later</Button>
				</div>
			</CardContent>
		</Card>
	);
}