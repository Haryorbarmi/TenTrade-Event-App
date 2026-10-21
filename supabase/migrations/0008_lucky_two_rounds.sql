-- Lucky Attendee is now two rounds: $100 for the first winner and $50 for the second
-- ($150 in total). The split per position lives in src/lib/prizes.ts.
update public.draws set prize_amount = 150, winners_count = 2 where type = 'lucky';
