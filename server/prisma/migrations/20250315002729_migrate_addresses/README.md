# Address Data Migration

This migration handles the transfer of existing address strings in the `LessonRequest` table to the new `Address` table structure.

## What This Migration Does

1. Creates a PostgreSQL function `parse_address()` that parses address strings into structured components
2. Finds all `LessonRequest` records that don't have an associated `Address` record
3. For each record:
   - Parses the address string into components (street, city, state, postal code, country)
   - Creates a new `Address` record with these components
   - Updates the `LessonRequest` to link to the new `Address` record
4. Drops the temporary function after use

## How to Run

This migration will run automatically when you apply Prisma migrations:

```bash
npx prisma migrate deploy
```

Or during development:

```bash
npx prisma migrate dev
```

## Verification

After running the migration, you can verify that all `LessonRequest` records have an associated `Address` record by running:

```sql
SELECT COUNT(*) FROM "LessonRequest" WHERE "addressId" IS NULL;
```

The result should be 0 if all records were successfully migrated.

## Troubleshooting

If some records weren't migrated (perhaps due to unexpected address formats), you can:

1. Check which records weren't migrated:
   ```sql
   SELECT id, address FROM "LessonRequest" WHERE "addressId" IS NULL;
   ```

2. Manually create `Address` records for these and update the `LessonRequest` records.

## Notes

- The migration handles various address formats but may not cover all edge cases
- Addresses with fewer than 3 comma-separated parts will have default values for missing components
- The country defaults to 'USA' if not specified 