import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the target from command line argument
const target = process.argv[2];
if (!target || !['frontend', 'server'].includes(target)) {
  console.error('Please specify either "frontend" or "server" as an argument');
  process.exit(1);
}

// Read the .env.prod file
const envFile = fs.readFileSync('env/.env.production', 'utf8');
const flyFile = fs.readFileSync(`docker/${target}/fly.toml`, 'utf8');

// Parse .env.prod file
const envVars = envFile
  .split('\n')
  .filter(line => 
    line.trim() && 
    !line.startsWith('#') && 
    line.includes('=')
  )
  .reduce((acc, line) => {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    acc[key.trim()] = value;
    return acc;
  }, {});

// Create the environment variables section
const envSection = [
  '# START: Environment variables from .env.prod',
  '# Only include environment variables that are not in .env.prod'
];
for (const [key, value] of Object.entries(envVars)) {
  envSection.push(`  ${key} = "${value}"`);
}
envSection.push('# END: Environment variables from .env.prod');

// Replace the section between START and END markers
const startMarker = '# START: Environment variables from .env.prod';
const endMarker = '# END: Environment variables from .env.prod';
const sectionRegex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
const updatedFlyConfig = flyFile.replace(
  sectionRegex,
  envSection.join('\n')
);

// Write the updated fly.toml
fs.writeFileSync(`docker/${target}/fly.toml`, updatedFlyConfig);

console.log(`Successfully updated docker/${target}/fly.toml with environment variables from .env.prod`); 