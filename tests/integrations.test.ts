/**
 * Integration Connector Tests
 * 
 * Tests the API integration connectors for:
 * - Clio (practice management)
 * - GoHighLevel (marketing automation)
 * - QuickBooks (financial data)
 * 
 * Tests both successful operations and error handling
 */

import { ClioConnector } from '../src/integrations/clio/client';
import { GoHighLevelConnector } from '../src/integrations/gohighlevel/client';
import { QuickBooksConnector } from '../src/integrations/quickbooks/client';

// Mock the global fetch function
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('API Integration Connectors', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Clio Integration', () => {
    const clioConnector = new ClioConnector('test-access-token');

    test('should fetch and transform Clio matters data', async () => {
      const mockClioResponse = {
        data: [
          {
            id: 1001,
            display_number: 'CASE-001',
            description: 'DUI Defense Matter',
            practice_area: { name: 'DUI' },
            status: 'open',
            custom_field_values: []
          },
          {
            id: 1002,
            display_number: 'CASE-002', 
            description: 'Traffic Violation',
            practice_area: { name: 'Traffic' },
            status: 'open',
            custom_field_values: []
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockClioResponse
      } as Response);

      const result = await clioConnector.fetchMetrics();

      expect(result.status).toBe('success');
      expect(result.data.activeCases).toBe(2);
      expect(result.data.matters).toHaveLength(2);
      
      const matter = result.data.matters[0];
      expect(matter.id).toBe('1001');
      expect(matter.name).toBe('CASE-001 - DUI Defense Matter');
      expect(matter.caseNumber).toBe('CASE-001');
      expect(matter.type).toBe('DUI');
      expect(matter.discoveryReceived).toBe(false);
      expect(matter.pleaOfferReceived).toBe(false);
    });

    test('should handle Clio API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      } as Response);

      await expect(clioConnector.fetchMetrics()).rejects.toThrow('Clio API Error: 401');
    });

    test('should handle missing access token', async () => {
      const clioConnectorNoToken = new ClioConnector(null);

      await expect(clioConnectorNoToken.fetchMetrics()).rejects.toThrow('Clio not configured');
    });

    test('should make correct API request to Clio', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      } as Response);

      await clioConnector.fetchMetrics();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://app.clio.com/api/v4/matters.json?status=open&limit=50',
        {
          headers: {
            'Authorization': 'Bearer test-access-token',
            'Content-Type': 'application/json'
          }
        }
      );
    });

    test('should calculate discovery and plea offer statistics', async () => {
      const mockResponse = {
        data: [
          { id: 1, display_number: 'CASE-001', description: 'Case 1', practice_area: { name: 'DUI' }, status: 'open' },
          { id: 2, display_number: 'CASE-002', description: 'Case 2', practice_area: { name: 'DUI' }, status: 'open' },
          { id: 3, display_number: 'CASE-003', description: 'Case 3', practice_area: { name: 'Traffic' }, status: 'open' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await clioConnector.fetchMetrics();

      expect(result.data.discoveryPending).toBe(3); // All cases default to false
      expect(result.data.pleaOffersPending).toBe(3); // All cases default to false
    });
  });

  describe('GoHighLevel Integration', () => {
    const ghlConnector = new GoHighLevelConnector('test-access-token');

    test('should fetch and transform GHL opportunities data', async () => {
      const mockGHLResponse = {
        opportunities: [
          {
            id: 'opp-001',
            contact: { name: 'John Doe' },
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
            status: 'open',
            pipelineStageName: 'Lead',
            source: 'Google Ads',
            assignedTo: 'Agent Smith'
          },
          {
            id: 'opp-002',
            name: 'Jane Smith',
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago  
            status: 'won',
            pipelineStageName: 'Closed Won',
            source: 'Facebook',
            assignedTo: 'Agent Jones'
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGHLResponse
      } as Response);

      const result = await ghlConnector.fetchMetrics();

      expect(result.status).toBe('success');
      expect(result.data.leadsWeekly).toBe(1); // Only one from last 7 days
      expect(result.data.consultsScheduled).toBe(1); // One with 'open' status
      expect(result.data.retainersSigned).toBe(1); // One with 'won' status
      expect(result.data.opportunityFeed).toHaveLength(2);
    });

    test('should handle GHL API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden'
      } as Response);

      await expect(ghlConnector.fetchMetrics()).rejects.toThrow('GHL API Error: 403');
    });

    test('should handle missing access token', async () => {
      const ghlConnectorNoToken = new GoHighLevelConnector(null);

      await expect(ghlConnectorNoToken.fetchMetrics()).rejects.toThrow('GoHighLevel not configured');
    });

    test('should make correct API request to GHL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ opportunities: [] })
      } as Response);

      await ghlConnector.fetchMetrics();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://services.leadconnectorhq.com/opportunities/search?limit=20',
        {
          headers: {
            'Authorization': 'Bearer test-access-token',
            'Version': '2021-07-28',
            'Content-Type': 'application/json'
          }
        }
      );
    });

    test('should handle opportunities with missing data gracefully', async () => {
      const mockResponse = {
        opportunities: [
          {
            id: 'opp-minimal',
            // Missing most fields
            createdAt: new Date().toISOString()
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await ghlConnector.fetchMetrics();

      expect(result.status).toBe('success');
      const opportunity = result.data.opportunityFeed[0];
      expect(opportunity.contactName).toBe('Unknown Lead');
      expect(opportunity.timeOnPhone).toBe('0m');
      expect(opportunity.pipelineStage).toBe('Open');
      expect(opportunity.source).toBe('Direct');
      expect(opportunity.owner).toBe('Unassigned');
    });

    test('should calculate weekly leads correctly', async () => {
      const now = Date.now();
      const mockResponse = {
        opportunities: [
          { id: '1', createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString() }, // 2 days ago
          { id: '2', createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString() }, // 5 days ago  
          { id: '3', createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString() }, // 10 days ago
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await ghlConnector.fetchMetrics();

      expect(result.data.leadsWeekly).toBe(2); // Only first two within 7 days
    });
  });

  describe('QuickBooks Integration', () => {
    const qbConnector = new QuickBooksConnector('test-access-token');

    test('should handle missing access token', async () => {
      const qbConnectorNoToken = new QuickBooksConnector(null);

      await expect(qbConnectorNoToken.fetchMetrics()).rejects.toThrow('QuickBooks not configured');
    });

    test('should return default data structure when configured', async () => {
      const result = await qbConnector.fetchMetrics();

      expect(result.status).toBe('success');
      expect(result.data).toEqual({
        revenueYTD: 0,
        adSpendYTD: 0,
        revenueWeekly: 0,
        expensesYTD: 0,
        profitMargin: 0,
        closedCasesWeekly: 0,
        paymentsCollectedWeekly: 0,
        avgCaseValue: 0,
        recentCollections: [],
        transactions: []
      });
    });

    test('should indicate need for realmId integration', async () => {
      // This test documents the current limitation
      // TODO: Once realmId is integrated, this test should be updated
      const result = await qbConnector.fetchMetrics();
      
      expect(result.status).toBe('success');
      expect(result.data.revenueYTD).toBe(0); // Default value, not real data
      
      // This test serves as a reminder that real QB integration 
      // requires realmId to be captured and passed to the connector
    });
  });

  describe('Base Connector Functionality', () => {
    test('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network connection failed'));

      const connector = new ClioConnector('test-token');
      
      await expect(connector.fetchMetrics()).rejects.toThrow('Network connection failed');
    });

    test('should handle invalid JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); }
      } as Response);

      const connector = new ClioConnector('test-token');
      
      await expect(connector.fetchMetrics()).rejects.toThrow('Invalid JSON');
    });
  });

  describe('Integration Data Validation', () => {
    test('should validate Clio response structure', async () => {
      const invalidResponse = {
        // Missing 'data' property
        matters: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse
      } as Response);

      const connector = new ClioConnector('test-token');
      const result = await connector.fetchMetrics();

      // Should handle missing data gracefully
      expect(result.data.matters).toEqual([]);
      expect(result.data.activeCases).toBe(0);
    });

    test('should validate GHL response structure', async () => {
      const invalidResponse = {
        // Missing 'opportunities' property
        data: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse
      } as Response);

      const connector = new GoHighLevelConnector('test-token');
      const result = await connector.fetchMetrics();

      // Should handle missing opportunities gracefully
      expect(result.data.opportunityFeed).toEqual([]);
      expect(result.data.leadsWeekly).toBe(0);
    });
  });

  describe('OAuth Token Validation', () => {
    test('should validate token format', () => {
      // Test various token formats
      const validTokens = [
        'valid-access-token-123',
        'Bearer abc123def456',
        'ya29.GlwwBuQaU1234567890'
      ];

      const invalidTokens = [
        '',
        null,
        undefined,
        'token with spaces',
        'token\nwith\nnewlines'
      ];

      validTokens.forEach(token => {
        expect(() => new ClioConnector(token)).not.toThrow();
      });

      invalidTokens.forEach(token => {
        const connector = new ClioConnector(token);
        // Should throw when trying to use the invalid token
        expect(async () => {
          await connector.fetchMetrics();
        }).rejects.toThrow();
      });
    });
  });

  describe('Rate Limiting and Error Handling', () => {
    test('should handle rate limiting responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded'
      } as Response);

      const connector = new ClioConnector('test-token');
      
      await expect(connector.fetchMetrics()).rejects.toThrow('Clio API Error: 429');
    });

    test('should handle server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error'
      } as Response);

      const connector = new GoHighLevelConnector('test-token');
      
      await expect(connector.fetchMetrics()).rejects.toThrow('GHL API Error: 500');
    });
  });
});