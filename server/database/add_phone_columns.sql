-- =====================================================
-- Fix: Add phone2-phone5 columns to customers table
-- Run this on the production database server
-- =====================================================

USE superart_repair;

-- Add phone2 if not exists
ALTER TABLE customers 
  ADD COLUMN IF NOT EXISTS phone2 VARCHAR(20) DEFAULT NULL AFTER phone,
  ADD COLUMN IF NOT EXISTS phone3 VARCHAR(20) DEFAULT NULL AFTER phone2,
  ADD COLUMN IF NOT EXISTS phone4 VARCHAR(20) DEFAULT NULL AFTER phone3,
  ADD COLUMN IF NOT EXISTS phone5 VARCHAR(20) DEFAULT NULL AFTER phone4;

-- Verify columns were added
DESCRIBE customers;
