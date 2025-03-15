-- This is an empty migration.

-- First, make sure all lesson requests have an address record
DO $$
DECLARE
  missing_count INT;
BEGIN
  -- Check if there are any lesson requests without an addressId
  SELECT COUNT(*) INTO missing_count FROM "LessonRequest" WHERE "addressId" IS NULL;
  
  IF missing_count > 0 THEN
    RAISE EXCEPTION 'There are still % lesson requests without an address record. Run the migrate_addresses migration first.', missing_count;
  END IF;
END $$;

-- Make the addressId column required (NOT NULL)
ALTER TABLE "LessonRequest" ALTER COLUMN "addressId" SET NOT NULL;

-- Drop the address column
ALTER TABLE "LessonRequest" DROP COLUMN "address";

-- Rename the relation (this is handled automatically by Prisma)
-- The field name in the Prisma schema changes from address_obj to address
-- but the database column name (addressId) remains the same