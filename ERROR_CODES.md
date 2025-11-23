# Error Codes Reference

## Authentication Errors (1xxx)

### AUTH_1001: Invalid API Key
**Cause:** The API key is invalid or expired  
**Solution:** Update your API key with `/provider <name>`

### AUTH_1002: Missing API Key
**Cause:** No API key configured for the provider  
**Solution:** Run `/setup` to configure provider

### AUTH_1003: Keychain Access Denied
**Cause:** Permission denied to access system keychain  
**Solution:** Grant keychain access in system preferences

## Provider Errors (2xxx)

### PROVIDER_2001: Provider Not Available
**Cause:** Selected provider is not responding  
**Solution:** Check network connection or try fallback provider

### PROVIDER_2002: Rate Limit Exceeded
**Cause:** Too many requests to provider API  
**Solution:** Wait a moment before retrying

### PROVIDER_2003: Network Error
**Cause:** Cannot connect to provider endpoint  
**Solution:** Check internet connection and firewall settings

### PROVIDER_2004: Invalid Response
**Cause:** Provider returned malformed response  
**Solution:** Check provider status or try different model

## Session Errors (3xxx)

### SESSION_3001: Session Not Found
**Cause:** Requested session ID doesn't exist  
**Solution:** Use `/list` to see available sessions

### SESSION_3002: Session Load Failed
**Cause:** Could not load session data  
**Solution:** Check file permissions and storage

### SESSION_3003: Session Save Failed
**Cause:** Could not save session data  
**Solution:** Check disk space and file permissions

### SESSION_3004: Decryption Failed
**Cause:** Session data is corrupted or encryption key changed  
**Solution:** Delete corrupted session or restore from backup

## Command Errors (4xxx)

### COMMAND_4001: Command Not Allowed
**Cause:** Command is not in whitelist  
**Solution:** Use `/help` to see allowed commands

### COMMAND_4002: Command Injection Blocked
**Cause:** Security filter detected malicious input  
**Solution:** Remove special characters from command

### COMMAND_4003: Command Execution Failed
**Cause:** Command failed to execute  
**Solution:** Check command syntax and permissions

### COMMAND_4004: Command Timeout
**Cause:** Command took too long to execute  
**Solution:** Try a simpler command or increase timeout

## File Errors (5xxx)

### FILE_5001: File Not Found
**Cause:** File path doesn't exist  
**Solution:** Verify path and try again

### FILE_5002: Access Denied
**Cause:** Insufficient permissions to access file  
**Solution:** Check file permissions

### FILE_5003: Path Traversal Blocked
**Cause:** Attempted to access file outside project  
**Solution:** Use paths relative to project root

## Tool Errors (6xxx)

### TOOL_6001: Tool Not Found
**Cause:** Requested tool doesn't exist  
**Solution:** Use `/help` to see available tools

### TOOL_6002: Invalid Arguments
**Cause:** Tool arguments are invalid or malformed  
**Solution:** Check tool usage and argument format

### TOOL_6003: Tool Execution Failed
**Cause:** Tool failed during execution  
**Solution:** Check tool-specific error details

## System Errors (9xxx)

### SYSTEM_9999: Unknown Error
**Cause:** An unexpected error occurred  
**Solution:** Check logs and contact support if persists

## Getting Help

For unlisted errors or persistent issues:
1. Check logs: `~/.aicli/logs/`
2. Run with debug: `DEBUG=* aicli chat`
3. Report issue: https://github.com/harryneopotter/aicli/issues
