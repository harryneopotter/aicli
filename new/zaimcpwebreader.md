# Web Reader MCP Server

<Info>
  The Web Reader MCP Server is a Z.AI implementation based on the Model Context Protocol (MCP). It provides Claude Code, Cline, and other MCP-compatible clients with powerful web content extraction capabilities, including full-page content retrieval and structured data extraction.
</Info>

## Overview

<Tip>
  This remote MCP server with web content reading capability is available to users on **GLM Coding Plan PRO and above**, enabling your code agent to fetch detailed page content and structured data.
</Tip>

## Features

<CardGroup cols={3}>
  <Card title="Web Content Reading" icon="globe">
    Fetch the complete content of any webpage, including text, and links
  </Card>

  <Card title="Structured Data" icon="clock">
    Extract structured data such as title, main body, and metadata
  </Card>

  <Card title="Remote Service" icon="link">
    HTTP-based remote MCP service, no local installation required
  </Card>
</CardGroup>

## Tools

This server implements the Model Context Protocol and works with any MCP-compatible client. Currently, it provides the following tool:

* **`webReader`** — Fetch webpage content for a specified URL. Returns the page title, main content, metadata, list of links, and more.

## Example Scenarios

<AccordionGroup>
  <Accordion title="API Documentation Reading and Summarization" defaultOpen>
    Automatically fetch and parse titles, body content, examples, and release notes from official documentation pages, distilling key takeaways to accelerate integration and implementation.
  </Accordion>

  <Accordion title="Open Source Project Page Parsing" defaultOpen>
    Parse project websites or repository pages (such as README, release notes, and usage guides) to extract core information and link lists, assisting evaluation and integration.
  </Accordion>

  <Accordion title="Technical Article Understanding and Knowledge Extraction">
    Extract steps, commands, and caveats from blogs, tutorials, and guide pages, organizing unstructured content into actionable developer notes and task lists.
  </Accordion>

  <Accordion title="Bug Resolution Using Reference Documentation">
    For issue remediation, read the publicly available steps on the specified web page and use them as references to resolve the problem.
  </Accordion>

  <Accordion title="Knowledge Base Construction and Synchronization">
    Convert content from designated web pages into structured data and leverage in-page links for incremental synchronization to build a team technical knowledge base.
  </Accordion>
</AccordionGroup>

## Installation and Usage

### Quick Start

<Steps>
  <Step title="Get API Key">
    Visit [Z.AI Console](https://z.ai/manage-apikey/apikey-list) to get your api key
  </Step>

  <Step title="Configure MCP Server">
    According to the client you’re using, **choose the corresponding installation method from the options below**.
  </Step>
</Steps>

### Supported Clients

<Tabs>
  <Tab title="Claude Code">
    **One-click install command**

    Replace `your_api_key` with the API key you obtained in the previous step

    ```bash  theme={null}
    claude mcp add -s user -t http web-reader https://api.z.ai/api/mcp/web_reader/mcp --header "Authorization: Bearer your_api_key"
    ```

    **Manual configuration**

    Edit the Claude Code configuration file under your home directory, the MCP section of `.claude.json`:

    ```json  theme={null}
    {
      "mcpServers": {
        "web-reader": {
          "type": "http",
          "url": "https://api.z.ai/api/mcp/web_reader/mcp",
          "headers": {
            "Authorization": "Bearer your_api_key"
          }
        }
      }
    }
    ```
  </Tab>

  <Tab title="Cline (VS Code)">
    Add the MCP server configuration in the Cline extension settings:

    Replace `your_api_key` with the API key you obtained in the previous step

    ```json  theme={null}
    {
      "mcpServers": {
        "web-reader": {
          "type": "sse",
          "url": "https://api.z.ai/api/mcp/web_reader/sse?Authorization=your_api_key"
        }
      }
    }
    ```
  </Tab>

  <Tab title="OpenCode">
    Add the MCP server configuration in OpenCode settings:

    See the [OpenCode MCP documentation](https://opencode.ai/docs/mcp-servers)

    Replace `your_api_key` with the API key you obtained in the previous step

    ```json  theme={null}
    {
        "$schema": "https://opencode.ai/config.json",
        "mcp": {
            "web-reader": {
                "type": "remote",
                "url": "https://api.z.ai/api/mcp/web_reader/mcp",
                "headers": {
                    "Authorization": "Bearer your_api_key"
                }
            }
        }
    }
    ```
  </Tab>

  <Tab title="Crush">
    Add the MCP server configuration in Crush settings:

    Replace `your_api_key` with the API key you obtained in the previous step

    ```json  theme={null}
    {
        "$schema": "https://charm.land/crush.json",
        "mcp": {
            "web-reader": {
                "type": "http",
                "url": "https://api.z.ai/api/mcp/web_reader/mcp",
                "headers": {
                    "Authorization": "Bearer your_api_key"
                }
            }
        }
    }
    ```
  </Tab>

  <Tab title="Goose">
    Add the MCP server in Goose:

    Go to `Extensions` -> `Add custom extension`

    Set Extension Name to `web-reader`, Type to `SSE`, and use the following endpoint:

    ```
    https://api.z.ai/api/mcp/web_reader/sse?Authorization=your_api_key
    ```

    Click `Add Extension` at the bottom. Remember to replace `your_api_key` with the API key you obtained in the previous step.
  </Tab>

  <Tab title="Roo Code, Kilo Code, Others">
    For Roo Code, Kilo Code, and other MCP-compatible clients, use the following general configuration:

    Replace `your_api_key` with the API key you obtained in the previous step

    ```json  theme={null}
    {
      "mcpServers": {
        "web-reader": {
          "type": "streamable-http",
          "url": "https://api.z.ai/api/mcp/web_reader/mcp",
          "headers": {
            "Authorization": "Bearer your_api_key"
          }
        }
      }
    }
    ```
  </Tab>
</Tabs>

## Troubleshooting

<AccordionGroup>
  <Accordion title="Invalid access token">
    **Issue:** Received an invalid access token error

    **Solutions:**

    1. Verify the token was copied correctly
    2. Check that the token is activated
    3. Ensure the token has sufficient balance
    4. Confirm the Authorization header format is correct
  </Accordion>

  <Accordion title="Connection timeout">
    **Issue:** Connection to the MCP server timed out

    **Solutions:**

    1. Check your network connection
    2. Verify firewall settings
    3. Ensure the server URL is correct
    4. Increase client timeout settings
  </Accordion>

  <Accordion title="Webpage fetch failed">
    **Issue:** Web content reading returned empty result or error

    **Solutions:**

    1. Confirm the target URL is accessible
    2. Check if the page has anti-scraping mechanisms
    3. Try different URLs
    4. Ensure network connectivity is normal
    5. Contact technical support for assistance
  </Accordion>
</AccordionGroup>

## Quota

<Check>
  The MCP quotas for the Lite, Pro and Max plans are as follows:

  * **Lite:** Include a total of 100 web searches and web readers, along with the 5-hour maximum prompt resource pool of the package for vision understanding.
  * **Pro:** Include a total of 1,000 web searches and web readers, along with the 5-hour maximum prompt resource pool of the package for vision understanding.
  * **Max:** Include a total of 4,000 web searches and web readers, along with the 5-hour maximum prompt resource pool of the package for vision understanding.
</Check>

## Resources

* [Model Context Protocol (MCP) Documentation](https://modelcontextprotocol.io/)
* [Claude Code MCP Configuration Guide](https://docs.anthropic.com/en/docs/claude-code/mcp)
* [Z.AI API Reference](/api-reference/introduction)
* [GLM Coding Plan Overview](/devpack/overview)
