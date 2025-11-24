**Origin Story: Why AiCli Exists**
==================================

AiCli wasn’t built to compete with anything.It wasn’t built as a product.It wasn’t even built with a roadmap in mind.

It started because I spend most of my time inside a terminal — managing servers, fixing deployments, reading logs, and jumping between projects. And as my workflow started involving LLMs more deeply, I found myself needing a tool that simply didn’t exist:

**an AI that lives** _**inside the terminal**_**, understands your project, uses real tools, and doesn’t require a subscription or cloud dependency.**

I tried existing AI terminals, but two things blocked me:

1.  **Subscription pricing for a hobby/home-lab workflow didn’t make sense.**
    
2.  **Cloud-only models didn’t fit how I work — most of my experiments run on local GPUs.**
    

So instead of paying for a tool that wasn’t built for my use case, I built the thing I wished someone else had made:

A local-first, extensible, agentic CLI assistant that works exactly the way I work.

**The First Goal Was Simple**
-----------------------------

I wanted something that could:

*   read the code in my current directory
    
*   answer questions about it
    
*   generate / modify files
    
*   run safe commands
    
*   and help me move faster without ever leaving the terminal
    

But once I got the basics working, the problem naturally expanded.

**Then It Became a Proper Agent System**
----------------------------------------

As the architecture grew (see architecture.md), AiCli evolved into:

*   a **ToolService** to execute agent commands safely
    
*   a **ContextService** to supply project context
    
*   a **ChatService** for multi-step reasoning
    
*   an **MCPService** for Model Context Protocol tool integration
    
*   a **RAGService** for semantic code search
    
*   an **AgentService** for persona-based workflows
    
*   a **SessionService** with encrypted state
    
*   a **ProviderFactory** for switching LLMs seamlessly
    

Everything modular.Everything testable.Everything running locally or through your choice of provider.

Not a shell replacement — a **developer AI layer that attaches to any terminal**.

**What AiCli Solves Today**
---------------------------

AiCli became the tool I personally needed:

*   A real agent that can Think → Act → Observe
    
*   Full support for reading/writing files
    
*   Verified safe-shell execution
    
*   MCP plug-in ecosystem
    
*   RAG-powered code understanding
    
*   Encrypted persistent chat sessions
    
*   True local-model support (Ollama / llama.cpp)
    
*   Flexible cloud providers (OpenAI / Anthropic / Gemini)
    

It is not a toy wrapper around an LLM API.It is a **developer assistant with actual operational superpowers**.

**Why This Repo Matters**
-------------------------

This repo represents a philosophy:

*   **Local-first**
    
*   **Privacy by default**
    
*   **No lock-in**
    
*   **Open, extensible architecture**
    
*   **Use the tools you already have**
    

AiCli wasn’t built to be sold.It was built because the modern developer workflow deserved something that worked the way _I_ worked — fast, agentic, and shaped around real-world projects, not demos.

And now that it exists, others may find it useful too.

**Want a Matching Section in Your README?**
