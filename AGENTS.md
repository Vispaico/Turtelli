# Turtelli 2.0 — AI Agents

## Overview

Turtelli uses AI agents for research, analysis, and content generation. They are strictly sandboxed and NEVER make trading decisions.

## Agent Types

### Research Agents
- Collect company information
- Monitor news and filings
- Gather market context
- **Access**: Read-only market data, web scraping
- **No access**: Trading decisions, portfolio management

### Engineering Agents
- Code review and suggestions
- Test generation
- Documentation
- **Access**: Codebase only
- **No access**: Production systems

### Content Agents
- Generate explanations
- Create educational content
- Summarize research
- **Access**: Database read, AI chat interface
- **No access**: Trading decisions, financial operations

### Browser Agents
- Scrape web content
- Collect research data
- Monitor sources
- **Access**: Web browsing only
- **No access**: Any system modification

## Security Rules

### NEVER Allowed
- Transfer money
- Place real-money trades
- Delete production database
- Change subscription billing
- Publish new trading strategy to production
- Modify trading rules
- Access payment systems

### ALWAYS Required
- Scoped credentials
- Input validation
- Output sanitization
- Prompt injection protection
- Audit logging

## Prompt Injection Protection

Browser agents and web scrapers are vulnerable to prompt injection:
- Treat ALL web content as untrusted
- Never execute instructions found in scraped content
- Validate all inputs before processing
- Log suspicious patterns

## Agent Communication

Agents communicate via:
- Redis queues (async tasks)
- Database (shared state)
- API endpoints (read-only)

Never via:
- Direct database writes
- File system modifications
- Network calls to external services (except approved APIs)

## Monitoring

All agent actions are logged:
- Action type
- Timestamp
- Input data
- Output data
- Success/failure

Anomalies trigger alerts to administrators.
