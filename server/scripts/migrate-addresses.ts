/**
 * Script to migrate existing lesson requests to use the Address model
 * 
 * This script will:
 * 1. Find all lesson requests that don't have an addressId
 * 2. Create Address records for them
 * 3. Update the lesson requests with the addressId
 */

import { lessonRequestService } from '../services/database/lessonRequestService.js';
import prisma from '../prisma.js';

async function migrateAddresses() {
  console.log('Starting address migration...');
  
  try {
    // Run the migration
    const migratedCount = await lessonRequestService.migrateAddresses();
    
    console.log(`Successfully migrated ${migratedCount} lesson requests to use the Address model.`);
    
    // Get the total count of lesson requests
    const totalCount = await prisma.lessonRequest.count();
    
    // Get the count of lesson requests that still don't have an addressId
    const remainingCount = await prisma.lessonRequest.count({
      where: {
        addressId: null
      }
    });
    
    console.log(`Total lesson requests: ${totalCount}`);
    console.log(`Lesson requests without an address: ${remainingCount}`);
    
    if (remainingCount === 0) {
      console.log('All lesson requests now have an address record!');
    } else {
      console.log(`There are still ${remainingCount} lesson requests without an address record.`);
      console.log('You may need to run this script again or fix these records manually.');
    }
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    // Close the Prisma client
    await prisma.$disconnect();
  }
}

// Run the migration
migrateAddresses().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 