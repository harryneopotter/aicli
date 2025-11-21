import google from 'google-it';
import fetch from 'node-fetch';

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

class WebService {
  async search(query: string): Promise<SearchResult[]> {
    try {
      const results = await google({ query });
      return results.slice(0, 10); // Return top 10 results
    } catch (error: any) {
      console.error('Web search failed:', error);
      throw new Error(`Web search failed: ${error.message}`);
    }
  }

  async fetch(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
      }
      // For simplicity, we'll just return the text content.
      // A more advanced implementation could parse the HTML.
      return await response.text();
    } catch (error: any) {
      console.error(`Web fetch failed for URL ${url}:`, error);
      throw new Error(`Failed to fetch content from ${url}: ${error.message}`);
    }
  }
}

export const webService = new WebService();
