/**
 * Build a complete API URL using the base URL and path
 * @param basePath - The base path for the API
 * @param path - The specific path/endpoint to access
 * @returns The complete URL
 */
export function buildApiUrl(basePath: string, path: string): string {
    // Handle multiple consecutive slashes in the path
    const normalizedPath = path.replace(/^\/+/, '/');
    let result: string;

    // Handle trailing/leading slashes to avoid double slashes in the URL
    if (basePath.endsWith('/') && normalizedPath.startsWith('/')) {
        result = `${basePath}${normalizedPath.substring(1)}`;
    }
    else if (!basePath.endsWith('/') && !normalizedPath.startsWith('/')) {
        result = `${basePath}/${normalizedPath}`;
    }
    else {
        result = `${basePath}${normalizedPath}`;
    }
    return result;
}
