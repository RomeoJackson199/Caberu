-- =========================================================
-- DROP UNUSED TEMPLATE SYSTEM TABLES
-- Date: 2026-01-05
-- Purpose: Remove salon/fitness tables not used in dental app
-- =========================================================
-- 
-- These tables were created in 20251031000000_enhance_template_system.sql
-- for multi-template support (hairdresser, personal trainer, beauty salon)
-- but are NOT used in the dental/healthcare application.
-- =========================================================

BEGIN;

-- Drop policies first (some may not exist, hence IF EXISTS)
DROP POLICY IF EXISTS "Users can view portfolio items for their business" ON portfolio_items;
DROP POLICY IF EXISTS "Users can insert portfolio items for their business" ON portfolio_items;
DROP POLICY IF EXISTS "Users can update portfolio items for their business" ON portfolio_items;
DROP POLICY IF EXISTS "Users can delete portfolio items for their business" ON portfolio_items;
DROP POLICY IF EXISTS "Business access to walk-in availability" ON walk_in_availability;
DROP POLICY IF EXISTS "Business access to style library" ON style_library;
DROP POLICY IF EXISTS "Business access to product sales" ON product_sales;
DROP POLICY IF EXISTS "Business access to workout plans" ON workout_plans;
DROP POLICY IF EXISTS "Business access to workout exercises" ON workout_exercises;
DROP POLICY IF EXISTS "Business access to measurements" ON client_measurements;
DROP POLICY IF EXISTS "Business access to nutrition plans" ON nutrition_plans;

-- Drop the tables (CASCADE will drop dependent objects like indexes)
DROP TABLE IF EXISTS workout_exercises CASCADE;
DROP TABLE IF EXISTS workout_plans CASCADE;
DROP TABLE IF EXISTS nutrition_plans CASCADE;
DROP TABLE IF EXISTS client_measurements CASCADE;
DROP TABLE IF EXISTS portfolio_items CASCADE;
DROP TABLE IF EXISTS walk_in_availability CASCADE;
DROP TABLE IF EXISTS style_library CASCADE;
DROP TABLE IF EXISTS product_sales CASCADE;

COMMIT;

-- =========================================================
-- TABLES DROPPED
-- =========================================================
-- 
-- Salon/Hairdresser:
--   - portfolio_items (gallery of haircuts/work)
--   - walk_in_availability (walk-in appointment slots)
--   - style_library (haircut reference catalog)
--   - product_sales (retail product tracking)
--
-- Personal Trainer/Fitness:
--   - workout_plans (client fitness plans)
--   - workout_exercises (exercises in workout plans)
--   - client_measurements (body weight, BMI, etc.)
--   - nutrition_plans (meal plans, calorie targets)
--
-- =========================================================
