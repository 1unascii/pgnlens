import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import authHeaders from './authHeaders'

// Mock localStorage since the threads pool doesn't provide it
const mockStorage: Record<string, string> = {}
const mockGetItem = vi.fn((key: string) => mockStorage[key] ?? null)
const mockSetItem = vi.fn((key: string, value: string) => { mockStorage[key] = value })

beforeEach(() => {
    // Clear storage between tests
    Object.keys(mockStorage).forEach(key => delete mockStorage[key])
    // Replace localStorage globally
    Object.defineProperty(globalThis, 'localStorage', {
        value: { getItem: mockGetItem, setItem: mockSetItem, removeItem: vi.fn() },
        writable: true,
    })
})

describe('authHeaders', () => {

    it('throws when no auth token exists', () => {
        expect(() => authHeaders()).toThrow('Not authenticated')
    })

    it('returns Authorization header with token', () => {
        mockStorage['authToken'] = 'test-token-123'
        const headers = authHeaders()
        expect(headers['Authorization']).toBe('Token test-token-123')
    })

    it('returns X-CSRFToken header', () => {
        mockStorage['authToken'] = 'test-token-123'
        const headers = authHeaders()
        expect('X-CSRFToken' in headers).toBe(true)
    })
})
