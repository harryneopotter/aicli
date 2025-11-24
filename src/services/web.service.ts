import { load } from 'cheerio';
import fetch from 'node-fetch';
import { logger } from './logger.service';

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

class WebService {
  async search(query: string): Promise<SearchResult[]> {
    try {
      // Switched to DuckDuckGo (HTML) to avoid 'google-it' vulnerabilities (request/form-data)
      const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Search failed with status ${response.status}`);
      }

      const html = await response.text();
      const $ = load(html);
      const results: SearchResult[] = [];

      $('.result').each((_i, element) => {
        if (results.length >= 10) return;

        const titleElement = $(element).find('.result__title .result__a');
        const snippetElement = $(element).find('.result__snippet');

        const title = titleElement.text().trim();
        const link = titleElement.attr('href');
        const snippet = snippetElement.text().trim();

        if (title && link && snippet) {
          results.push({ title, link, snippet });
        }
      });

      return results;
    } catch (error: any) {
      logger.error('Web search failed', { query, error: error.message });
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
      logger.error('Web fetch failed', { url, error: error.message });
      throw new Error(`Failed to fetch content from ${url}: ${error.message}`);
    }
  }
}

export const webService = new WebService();
