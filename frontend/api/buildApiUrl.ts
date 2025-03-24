/**
 * Build a complete API URL using the base URL and path
 * @param basePath - The base path for the API
 * @param path - The specific path/endpoint to access
 * @returns The complete URL
 */
export function buildApiUrl(basePath: string, path: string): string {
  // Debug input parameters
  console.log('[API DEBUG] buildApiUrl called with:', { basePath, path });
  
  // Handle multiple consecutive slashes in the path
  const normalizedPath = path.replace(/^\/+/, '/');
  console.log('[API DEBUG] Normalized path:', normalizedPath);
  
  let result: string;
  
  // Handle trailing/leading slashes to avoid double slashes in the URL
  if (basePath.endsWith('/') && normalizedPath.startsWith('/')) {
    result = `${basePath}${normalizedPath.substring(1)}`;
    console.log('[API DEBUG] Case 1: basePath ends with /, path starts with /');
  } else if (!basePath.endsWith('/') && !normalizedPath.startsWith('/')) {
    result = `${basePath}/${normalizedPath}`;
    console.log('[API DEBUG] Case 2: basePath does not end with /, path does not start with /');
  } else {
    result = `${basePath}${normalizedPath}`;
    console.log('[API DEBUG] Case 3: Either basePath ends with / or path starts with /');
  }
  
  console.log('[API DEBUG] Final URL:', result);
  return result;
} 