# Warp CLI Examples

This document provides practical examples of using Warp CLI for various tasks.

## Getting Started

### First-Time Setup
```bash
# Run the interactive setup
warp setup

# Follow the prompts to:
# 1. Choose your LLM provider
# 2. Configure API keys (if needed)
# 3. Set preferences
```

### Starting a Session
```bash
# Start with default settings
warp

# Start with a specific provider
warp chat --provider openai

# Resume a previous session
warp chat --session a1b2c3d4
```

## Common Use Cases

### 1. Learning Commands

**Ask about any command:**
```
💬 chat > What does the grep command do?

🤖 ASSISTANT
`grep` searches for patterns in text. Common uses:

- `grep "pattern" file.txt` - Search in a file
- `grep -r "pattern" .` - Recursive search
- `grep -i "pattern" file` - Case-insensitive
- `grep -v "pattern" file` - Invert match (show non-matching)
```

**Get command explanations:**
```
💬 chat > /explain docker-compose up -d

🤖 ASSISTANT
This command starts Docker containers defined in docker-compose.yml:

- `docker-compose` - Docker orchestration tool
- `up` - Create and start containers
- `-d` - Detached mode (run in background)

The containers will start and continue running after the command exits.
```

### 2. Debugging Errors

**Debug compilation errors:**
```
💬 chat > I'm getting "error: expected ';' before '}' token" in C++

🤖 ASSISTANT
This error means you're missing a semicolon before a closing brace.

Common causes:
1. Missing semicolon after a class definition
2. Missing semicolon after a struct
3. Forgotten semicolon at end of statement

Example fix:
```cpp
// Wrong:
class MyClass {
    // ...
}  // Missing semicolon!

// Correct:
class MyClass {
    // ...
};  // Semicolon added
```
```

**Debug runtime errors:**
```
💬 chat > /exec npm test

[Test output with errors...]

💬 chat > The test is failing with "Cannot read property 'length' of undefined". How do I fix this?

🤖 ASSISTANT
This error means you're trying to access the `length` property on an undefined value.

Solutions:
1. Add null/undefined checks:
   ```javascript
   if (array && array.length > 0) {
       // Use array
   }
   ```

2. Use optional chaining:
   ```javascript
   const len = array?.length ?? 0;
   ```

3. Ensure the variable is initialized before use
```

### 3. Code Generation

**Generate boilerplate code:**
```
💬 chat > Create a REST API endpoint in Express.js for getting user by ID

🤖 ASSISTANT
Here's a REST API endpoint for getting a user by ID:

```javascript
const express = require('express');
const router = express.Router();

// GET user by ID
router.get('/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        // Fetch user from database
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

module.exports = router;
```

Usage:
```javascript
const userRoutes = require('./routes/users');
app.use('/api', userRoutes);
```
```

**Generate test cases:**
```
💬 chat > Write Jest tests for a function that adds two numbers

🤖 ASSISTANT
Here are Jest tests for an add function:

```javascript
// add.js
function add(a, b) {
    return a + b;
}

module.exports = add;

// add.test.js
const add = require('./add');

describe('add function', () => {
    test('adds two positive numbers', () => {
        expect(add(2, 3)).toBe(5);
    });

    test('adds two negative numbers', () => {
        expect(add(-2, -3)).toBe(-5);
    });

    test('adds positive and negative numbers', () => {
        expect(add(5, -3)).toBe(2);
    });

    test('adds zero', () => {
        expect(add(5, 0)).toBe(5);
        expect(add(0, 5)).toBe(5);
    });

    test('handles decimal numbers', () => {
        expect(add(0.1, 0.2)).toBeCloseTo(0.3);
    });
});
```

Run tests:
```bash
npm test
```
```

### 4. Git Operations

**Git workflow assistance:**
```
💬 chat > /git status

On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  modified:   src/index.js

💬 chat > What's the best way to commit these changes?

🤖 ASSISTANT
Here's the recommended Git workflow:

1. **Stage your changes:**
   ```bash
   git add src/index.js
   ```

2. **Commit with a descriptive message:**
   ```bash
   git commit -m "feat: update index.js with new feature"
   ```

3. **Push to remote:**
   ```bash
   git push origin main
   ```

**Commit message tips:**
- Use conventional commits (feat:, fix:, docs:, etc.)
- Keep first line under 50 characters
- Use present tense ("add" not "added")

Would you like me to help you write a commit message?
```

**Resolve merge conflicts:**
```
💬 chat > I have a merge conflict in package.json. How do I resolve it?

🤖 ASSISTANT
To resolve merge conflicts:

1. **Open the conflicted file** (package.json)
   You'll see markers like:
   ```
   <<<<<<< HEAD
   Your changes
   =======
   Incoming changes
   >>>>>>> branch-name
   ```

2. **Decide what to keep:**
   - Keep your changes (above =======)
   - Keep incoming changes (below =======)
   - Keep both (merge manually)
   - Write new code

3. **Remove conflict markers:**
   Delete the `<<<<<<<`, `=======`, and `>>>>>>>` lines

4. **Stage the resolved file:**
   ```bash
   git add package.json
   ```

5. **Complete the merge:**
   ```bash
   git commit
   ```

For package.json, often you want both changes. Merge dependencies carefully!
```

### 5. System Administration

**Check system resources:**
```
💬 chat > /exec df -h

Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       100G   75G   25G  75% /

💬 chat > My disk is 75% full. What should I clean up?

🤖 ASSISTANT
Here are safe things to clean up:

1. **Package manager caches:**
   ```bash
   # Ubuntu/Debian
   sudo apt clean
   sudo apt autoclean

   # macOS
   brew cleanup
   ```

2. **Docker cleanup:**
   ```bash
   docker system prune -a
   ```

3. **Node.js caches:**
   ```bash
   npm cache clean --force
   ```

4. **Find large files:**
   ```bash
   du -ah . | sort -rh | head -20
   ```

5. **Remove old logs:**
   ```bash
   sudo journalctl --vacuum-time=7d
   ```

Always backup important data first!
```

### 6. Project Setup

**Initialize a new project:**
```
💬 chat > /suggest Create a new React project with TypeScript

🤖 ASSISTANT
To create a new React project with TypeScript:

**Option 1: Using Vite (Recommended - Faster)**
```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm run dev
```

**Option 2: Using Create React App**
```bash
npx create-react-app my-app --template typescript
cd my-app
npm start
```

**Project structure:**
```
my-app/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   └── components/
├── public/
├── package.json
└── tsconfig.json
```

**Next steps:**
1. Install additional dependencies (e.g., React Router)
2. Set up ESLint and Prettier
3. Configure your IDE
4. Start building components!
```

### 7. Database Queries

**SQL help:**
```
💬 chat > Write a SQL query to find users who registered in the last 30 days

🤖 ASSISTANT
Here's a SQL query to find recent users:

```sql
SELECT
    id,
    username,
    email,
    created_at
FROM users
WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
ORDER BY created_at DESC;
```

**Variations:**

For PostgreSQL:
```sql
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
```

For SQLite:
```sql
WHERE created_at >= datetime('now', '-30 days')
```

With count:
```sql
SELECT COUNT(*) as new_users
FROM users
WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY);
```
```

### 8. Session Management

**Save important conversations:**
```
💬 chat > How do I deploy a Node.js app to AWS?

[Long conversation about AWS deployment...]

💬 chat > /save aws-deployment-guide

✅ Session saved: aws-deployment-guide (ID: a1b2c3d4)
```

**Search past sessions:**
```
💬 chat > /search Docker

╔══════════╤═══════════════════╤══════════════════╗
║ ID       │ Name              │ Created          ║
╟──────────┼───────────────────┼──────────────────╢
║ b2c3d4e5 │ docker-setup      │ Jan 10, 2024 ... ║
║ c3d4e5f6 │ docker-debugging  │ Jan 12, 2024 ... ║
╚══════════╧═══════════════════╧══════════════════╝

💬 chat > /load b2c3d4e5

✅ Loaded session: docker-setup
```

**Export sessions:**
```bash
# Export as JSON
warp sessions --export a1b2c3d4 --format json > session.json

# Export as Markdown
warp sessions --export a1b2c3d4 --format markdown > session.md
```

### 9. Multi-Provider Usage

**Switch between providers:**
```
💬 chat > /provider ollama
✅ Switched to provider: ollama

💬 chat > Test local model

🤖 ASSISTANT [Ollama]
Hello! I'm running locally on your machine...

💬 chat > /provider openai
✅ Switched to provider: openai

💬 chat > Test cloud model

🤖 ASSISTANT [OpenAI]
Hello! I'm running on OpenAI's servers...
```

**Compare provider responses:**
```bash
# Terminal 1
warp chat --provider ollama

# Terminal 2
warp chat --provider openai

# Ask the same question in both and compare results!
```

### 10. Advanced Workflows

**Chain commands:**
```
💬 chat > /exec npm run build

[Build output...]

💬 chat > Was the build successful? If yes, suggest the deployment command.

🤖 ASSISTANT
Yes, the build was successful! Here's how to deploy:

**For Vercel:**
```bash
vercel --prod
```

**For Netlify:**
```bash
netlify deploy --prod
```

**For AWS S3:**
```bash
aws s3 sync dist/ s3://your-bucket-name
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

Choose based on your hosting provider!
```

**Automated testing workflow:**
```
💬 chat > /exec npm test

[Test failures...]

💬 chat > 3 tests failed. Analyze the failures and suggest fixes.

🤖 ASSISTANT
I see 3 test failures:

1. **Test: "should validate email"**
   - Error: Expected "invalid" but got "valid"
   - Fix: Update regex to properly validate email format

2. **Test: "should handle null input"**
   - Error: Cannot read property of null
   - Fix: Add null check before processing

3. **Test: "should parse JSON"**
   - Error: Unexpected token in JSON
   - Fix: Wrap in try-catch for error handling

Would you like me to show the code fixes for these?
```

## Tips and Tricks

### 1. Context Awareness
The AI automatically knows your:
- Current directory
- Git status
- Project type
- Recent commands

Use this to your advantage:
```
💬 chat > What dependencies should I add?
# AI knows you're in a Node.js project and suggests appropriate packages
```

### 2. Quick Command Execution
```
💬 chat > /exec npm install express
# Executes and adds to context

💬 chat > Show me how to use what I just installed
# AI knows you just installed Express
```

### 3. Efficient Session Management
- Use `/save` frequently for important conversations
- Name sessions descriptively: `docker-setup` not `session1`
- Use `/search` to find old conversations quickly

### 4. Combine with Shell
```bash
# Pipe command output to file, then ask about it
ls -la > files.txt
warp
💬 chat > /exec cat files.txt
💬 chat > Explain what these files do
```

## Keyboard Shortcuts

- `Ctrl+C` - Cancel current operation
- `Ctrl+D` - Exit (same as `/exit`)
- `Ctrl+L` - Clear screen (same as `/clear`)
- `↑/↓` - Command history (readline feature)

## Best Practices

1. **Be specific** - "How do I fix CORS in Express?" vs "fix cors"
2. **Provide context** - Include error messages, code snippets
3. **Use commands** - `/exec`, `/explain`, `/suggest` for specific tasks
4. **Save sessions** - Don't lose important conversations
5. **Switch providers** - Try different models for different tasks

## Need More Help?

- Type `/help` in any session
- Check the main README: [README.md](README.md)
- Visit: https://github.com/harryneopotter/aicli

Happy coding! 🚀
