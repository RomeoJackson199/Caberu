-- Add unique constraint for dentist availability upsert
ALTER TABLE dentist_availability 
ADD CONSTRAINT dentist_availability_dentist_day_unique 
UNIQUE (dentist_id, day_of_week, business_id);