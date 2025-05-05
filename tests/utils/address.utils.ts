import axios from 'axios';
import { AxiosResponse } from 'axios';
import { Address } from '@shared/models/Address';

const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL in address.utils.ts');
}

/**
 * Creates a new address via the API.
 * @param token - The authentication token (JWT).
 * @param addressData - The data for the address to create.
 * @returns Axios response promise.
 */
export const createAddress = (token: string, addressData: Partial<Address>): Promise<AxiosResponse<Address>> => {
    return axios.post(`${API_BASE_URL}/api/v1/addresses`, addressData, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

/**
 * Fetches an address by its ID via the API.
 * @param token - The authentication token (JWT).
 * @param addressId - The ID of the address to fetch.
 * @returns Axios response promise.
 */
export const getAddressById = (token: string, addressId: string): Promise<AxiosResponse<Address>> => {
    return axios.get(`${API_BASE_URL}/api/v1/addresses/${addressId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

/**
 * Fetches an address by its ID via the API without authentication.
 * @param addressId - The ID of the address to fetch.
 * @returns Axios response promise.
 */
export const getAddressByIdUnauthenticated = (addressId: string): Promise<AxiosResponse> => {
    return axios.get(`${API_BASE_URL}/api/v1/addresses/${addressId}`);
};

/**
 * Creates a new address via the API without authentication.
 * @param addressData - The data for the address to create.
 * @returns Axios response promise.
 */
export const createAddressUnauthenticated = (addressData: Partial<Address>): Promise<AxiosResponse> => {
    return axios.post(`${API_BASE_URL}/api/v1/addresses`, addressData);
}; 