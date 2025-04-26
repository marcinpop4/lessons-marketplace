import request from 'supertest';
import { Address } from '@shared/models/Address';

const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL in address.utils.ts');
}

/**
 * Creates a new address via the API.
 * @param token - The authentication token (JWT).
 * @param addressData - The data for the address to create.
 * @returns The supertest response promise.
 */
export const createAddress = (token: string, addressData: Partial<Address>): request.Test => {
    return request(API_BASE_URL!)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${token}`)
        .send(addressData);
};

/**
 * Fetches an address by its ID via the API.
 * @param token - The authentication token (JWT).
 * @param addressId - The ID of the address to fetch.
 * @returns The supertest response promise.
 */
export const getAddressById = (token: string, addressId: string): request.Test => {
    return request(API_BASE_URL!)
        .get(`/api/v1/addresses/${addressId}`)
        .set('Authorization', `Bearer ${token}`);
};

/**
 * Fetches an address by its ID via the API without authentication.
 * @param addressId - The ID of the address to fetch.
 * @returns The supertest response promise.
 */
export const getAddressByIdUnauthenticated = (addressId: string): request.Test => {
    return request(API_BASE_URL!)
        .get(`/api/v1/addresses/${addressId}`);
};

/**
 * Creates a new address via the API without authentication.
 * @param addressData - The data for the address to create.
 * @returns The supertest response promise.
 */
export const createAddressUnauthenticated = (addressData: Partial<Address>): request.Test => {
    return request(API_BASE_URL!)
        .post('/api/v1/addresses')
        .send(addressData);
}; 