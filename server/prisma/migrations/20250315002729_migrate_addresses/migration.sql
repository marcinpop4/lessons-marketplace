-- This is an empty migration.

-- Migrate existing address strings to the Address table
-- This migration will:
-- 1. Create Address records for all LessonRequests that don't have an addressId
-- 2. Update the LessonRequests to link to the new Address records

-- First, create a function to parse address strings
CREATE OR REPLACE FUNCTION parse_address(address_str TEXT)
RETURNS TABLE(
  street TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT
) AS $$
DECLARE
  parts TEXT[];
  state_postal TEXT[];
BEGIN
  -- Split the address by commas
  parts := string_to_array(address_str, ',');
  
  -- Default values for incomplete addresses
  street := COALESCE(TRIM(parts[1]), address_str);
  city := COALESCE(TRIM(parts[2]), 'Unknown');
  
  -- Handle state and postal code
  IF array_length(parts, 1) >= 3 THEN
    -- Split the third part by spaces to separate state and postal code
    state_postal := string_to_array(TRIM(parts[3]), ' ');
    
    IF array_length(state_postal, 1) > 1 THEN
      -- Last element is postal code, the rest is state
      postal_code := state_postal[array_length(state_postal, 1)];
      state := array_to_string(state_postal[1:array_length(state_postal, 1)-1], ' ');
    ELSE
      state := TRIM(parts[3]);
      postal_code := 'Unknown';
    END IF;
  ELSE
    state := 'Unknown';
    postal_code := 'Unknown';
  END IF;
  
  -- Default country to USA if not specified
  country := COALESCE(TRIM(parts[4]), 'USA');
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Migrate the addresses in a transaction
DO $$
DECLARE
  lesson_request RECORD;
  address_id UUID;
  address_parts RECORD;
  total_count INT;
  migrated_count INT := 0;
BEGIN
  -- Get count of lesson requests without an addressId
  SELECT COUNT(*) INTO total_count FROM "LessonRequest" WHERE "addressId" IS NULL;
  RAISE NOTICE 'Found % lesson requests without an address record', total_count;
  
  -- Process each lesson request
  FOR lesson_request IN SELECT id, address FROM "LessonRequest" WHERE "addressId" IS NULL
  LOOP
    -- Skip if no address string
    IF lesson_request.address IS NULL OR lesson_request.address = '' THEN
      RAISE NOTICE 'Lesson request % has no address string, skipping', lesson_request.id;
      CONTINUE;
    END IF;
    
    -- Parse the address
    SELECT * INTO address_parts FROM parse_address(lesson_request.address);
    
    -- Create a new address record
    INSERT INTO "Address" (id, street, city, state, "postalCode", country, "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid(),
      address_parts.street,
      address_parts.city,
      address_parts.state,
      address_parts.postal_code,
      address_parts.country,
      NOW(),
      NOW()
    )
    RETURNING id INTO address_id;
    
    -- Update the lesson request with the new addressId
    UPDATE "LessonRequest"
    SET "addressId" = address_id
    WHERE id = lesson_request.id;
    
    migrated_count := migrated_count + 1;
    
    -- Log progress every 10 records
    IF migrated_count % 10 = 0 THEN
      RAISE NOTICE 'Migrated %/% records...', migrated_count, total_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Successfully migrated %/% lesson requests', migrated_count, total_count;
  
  -- Get the count of lesson requests that still don't have an addressId
  SELECT COUNT(*) INTO total_count FROM "LessonRequest" WHERE "addressId" IS NULL;
  
  IF total_count = 0 THEN
    RAISE NOTICE 'All lesson requests now have an address record!';
  ELSE
    RAISE NOTICE 'There are still % lesson requests without an address record', total_count;
    RAISE NOTICE 'You may need to run this migration again or fix these records manually';
  END IF;
END $$;

-- Drop the function after use
DROP FUNCTION IF EXISTS parse_address;