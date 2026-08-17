-- Migration: Add judgment columns to image history table
-- Plan 04-vision-standard-ui-part2, Task 237

-- Add PASS/FAIL judgment to the ImageHistory table
ALTER TABLE ImageHistory ADD COLUMN JudgmentPass INTEGER; -- 1=PASS, 0=FAIL, NULL=unevaluated
ALTER TABLE ImageHistory ADD COLUMN JudgmentConfidence REAL; -- 0.0-100.0
ALTER TABLE ImageHistory ADD COLUMN JudgmentLabel TEXT;
ALTER TABLE ImageHistory ADD COLUMN IsGolden INTEGER NOT NULL DEFAULT 0; -- 1=golden baseline
ALTER TABLE ImageHistory ADD COLUMN GoldenSetAt INTEGER; -- unix timestamp
