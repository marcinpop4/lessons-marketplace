// Skip Husky install in production and CI
if (process.env.ENV_TYPE === 'prod' || process.env.ENV_TYPE === 'ci') {
  process.exit(0)
}
const husky = (await import('husky')).default
console.log(husky()) 