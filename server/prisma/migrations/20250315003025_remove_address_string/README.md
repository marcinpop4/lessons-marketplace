# Remove Address String Migration

This migration completes the transition from using a string address to using the structured Address model.

## What This Migration Does

1. Verifies that all `LessonRequest` records have an associated `Address` record
2. Makes the `addressId` column required (NOT NULL)
3. Drops the old `address` string column

## Prerequisites

Before running this migration, ensure that the `migrate_addresses` migration has been run successfully. This migration will fail if there are any `LessonRequest` records without an `addressId`.

## How to Run

This migration will run automatically when you apply Prisma migrations:

```bash
npx prisma migrate dev
```

Or in production:

```bash
npx prisma migrate deploy
```

## Verification

After running the migration, you can verify that:

1. The `address` column no longer exists in the `LessonRequest` table
2. All `LessonRequest` records have a non-null `addressId`

## Rollback Considerations

This migration permanently removes data (the address string column). If you need to roll back:

1. You would need to add the `address` column back
2. You would need to populate it with data from the `Address` table
3. You would need to make the `addressId` column nullable again

Consider taking a database backup before applying this migration in production. 