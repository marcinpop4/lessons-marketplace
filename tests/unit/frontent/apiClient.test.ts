/**
 * Unit tests for the apiClient's buildApiUrl function
 */

import { buildApiUrl } from '../../../frontend/api/buildApiUrl';

describe('apiClient', () => {
  describe('buildApiUrl', () => {
    it('should concatenate base path and path correctly when base path ends with slash and path starts with slash', () => {
      const basePath = 'https://api.example.com/';
      const path = '/v1/users';
      const result = buildApiUrl(basePath, path);
      expect(result).toBe('https://api.example.com/v1/users');
    });

    it('should concatenate base path and path correctly when base path does not end with slash and path does not start with slash', () => {
      const basePath = 'https://api.example.com';
      const path = 'v1/users';
      const result = buildApiUrl(basePath, path);
      expect(result).toBe('https://api.example.com/v1/users');
    });

    it('should concatenate base path and path correctly when base path does not end with slash and path starts with slash', () => {
      const basePath = 'https://api.example.com';
      const path = '/v1/users';
      const result = buildApiUrl(basePath, path);
      expect(result).toBe('https://api.example.com/v1/users');
    });

    it('should concatenate base path and path correctly when base path ends with slash and path does not start with slash', () => {
      const basePath = 'https://api.example.com/';
      const path = 'v1/users';
      const result = buildApiUrl(basePath, path);
      expect(result).toBe('https://api.example.com/v1/users');
    });

    it('should handle empty path correctly', () => {
      const basePath = 'https://api.example.com';
      const path = '';
      const result = buildApiUrl(basePath, path);
      expect(result).toBe('https://api.example.com/');
    });

    it('should handle root path correctly', () => {
      const basePath = 'https://api.example.com';
      const path = '/';
      const result = buildApiUrl(basePath, path);
      expect(result).toBe('https://api.example.com/');
    });

    it('should handle multiple consecutive slashes in path', () => {
      const basePath = 'https://api.example.com/';
      const path = '//v1/users';
      const result = buildApiUrl(basePath, path);
      expect(result).toBe('https://api.example.com/v1/users');
    });
  });
}); 