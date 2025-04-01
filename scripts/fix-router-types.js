import fs from 'fs';
import { execSync } from 'child_process';

// Find all router files
const routerFiles = execSync('find server -name "*Routes.ts"', { encoding: 'utf8' })
  .trim()
  .split('\n');

// Add the auth router file which doesn't follow the naming pattern
if (!routerFiles.includes('server/routes/auth/authRoutes.ts')) {
  routerFiles.push('server/routes/auth/authRoutes.ts');
}

console.log(`Found ${routerFiles.length} router files to update`);

let updatedCount = 0;

routerFiles.forEach(filePath => {
  try {
    console.log(`Processing ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has Router import
    if (content.includes('import express, { Router }')) {
      console.log(`  - Already updated`);
      return;
    }
    
    let updatedContent;
    
    // If it already imports from express with destructuring
    if (content.match(/import express, \{([^}]*)\} from 'express'/)) {
      updatedContent = content.replace(
        /import express, \{([^}]*)\} from 'express'/,
        (match, p1) => {
          const imports = p1.split(',').map(i => i.trim());
          if (!imports.includes('Router')) {
            imports.push('Router');
            return `import express, { ${imports.join(', ')} } from 'express'`;
          }
          return match;
        }
      );
    } else if (content.includes("import express from 'express'")) {
      // Simple case: just add Router to import
      updatedContent = content.replace(
        "import express from 'express'",
        "import express, { Router } from 'express'"
      );
    } else {
      console.error(`  - Cannot update import in ${filePath}`);
      return;
    }
    
    // Add type annotation to router
    updatedContent = updatedContent.replace(
      /const router = express\.Router\(\)/g,
      'const router: Router = express.Router()'
    );
    
    // Write back the updated content
    fs.writeFileSync(filePath, updatedContent);
    console.log(`  - Updated successfully`);
    updatedCount++;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
});

console.log(`Successfully updated ${updatedCount} of ${routerFiles.length} router files`); 