"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const buildenv_1 = require("./buildenv");
/*
## Tool Server (not yet used)

```sh
npm run server
xattr -dr com.apple.quarantine llvm-mos/bin/* # macOS only
curl http://localhost:3009/test
go to: http://localhost:8000/?platform=c64&file=hello.c&tool=llvm-mos
```
*/
////////////////////
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: 1024 * 1024 })); // limit 1 MB
app.use(express_1.default.text({ limit: 1024 * 1024 })); // limit 1 MB for text files
app.use(express_1.default.urlencoded({ extended: true, limit: 1024 * 1024 })); // for FormData
app.get('/info', (req, res) => {
    // send a list of supported tools
    res.json({ tools: buildenv_1.TOOLS });
});
app.get('/test1', async (req, res, next) => {
    // quick test of the build
    try {
        const updates = [{ path: 'test.c', data: 'int main() { return 0; }' }];
        const buildStep = { tool: 'llvm-mos', platform: 'c64', files: ['test.c'] };
        const env = new buildenv_1.ServerBuildEnv(SERVER_ROOT, 'test', buildenv_1.TOOLS[0]);
        const result = await env.compileAndLink(buildStep, updates);
        res.json(result);
    }
    catch (err) {
        return next(err);
    }
});
app.get('/test2', async (req, res, next) => {
    // quick test of the build
    try {
        const updates = [{ path: 'test.c', data: 'int main() { return 0; }' }];
        const buildStep = { tool: 'oscar64', platform: 'c64', files: ['test.c'] };
        const env = new buildenv_1.ServerBuildEnv(SERVER_ROOT, 'test', buildenv_1.TOOLS[1]);
        const result = await env.compileAndLink(buildStep, updates);
        res.json(result);
    }
    catch (err) {
        return next(err);
    }
});
app.post('/build', async (req, res, next) => {
    try {
        const updates = req.body.updates;
        const buildStep = req.body.buildStep;
        const sessionID = req.body.sessionID;
        const bestTool = (0, buildenv_1.findBestTool)(buildStep);
        const env = new buildenv_1.ServerBuildEnv(SERVER_ROOT, sessionID, bestTool);
        const result = await env.compileAndLink(buildStep, updates);
        res.json(result);
    }
    catch (err) {
        return next(err);
    }
});
// Save user files for jsbeeb loadBasic parameter
app.post('/userfile', (req, res, next) => {
    try {
        const { content, session, file } = req.body;
        if (!content || !session || !file) {
            return res.status(400).json({ error: 'Missing parameters' });
        }
        const sessionPath = path_1.default.join(SESSION_ROOT, session);
        // Create session directory if it doesn't exist
        if (!fs_1.default.existsSync(sessionPath)) {
            fs_1.default.mkdirSync(sessionPath, { recursive: true });
        }
        const filePath = path_1.default.join(sessionPath, file);
        // Security check: ensure the file is within the session directory
        if (!filePath.startsWith(sessionPath)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Write the file content
        fs_1.default.writeFileSync(filePath, content, 'utf8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.json({ success: true, path: filePath });
    }
    catch (err) {
        return next(err);
    }
});
// Serve user files for jsbeeb loadBasic parameter
app.get('/userfile/:sessionID/:filename', (req, res, next) => {
    try {
        const { sessionID, filename } = req.params;
        const sessionPath = path_1.default.join(SESSION_ROOT, sessionID);
        const filePath = path_1.default.join(sessionPath, filename);
        // Security check: ensure the file is within the session directory
        if (!filePath.startsWith(sessionPath)) {
            return res.status(403).send('Access denied');
        }
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).send('File not found');
        }
        // Set appropriate headers for BASIC files
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Access-Control-Allow-Origin', '*');
        // Stream the file
        const fileStream = fs_1.default.createReadStream(filePath);
        fileStream.pipe(res);
    }
    catch (err) {
        return next(err);
    }
});
// Catch errors
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});
// Start the server
const port = 3009;
/*{
    origin: [`http://localhost:${port}`, 'http://localhost:8000']
}));*/
const SERVER_ROOT = process.env['_8BITWS_SERVER_ROOT'] || path_1.default.resolve('./server-root');
const SESSION_ROOT = path_1.default.join(SERVER_ROOT, 'sessions');
if (!fs_1.default.existsSync(SESSION_ROOT)) {
    fs_1.default.mkdirSync(SESSION_ROOT);
}
process.chdir(SESSION_ROOT);
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
//# sourceMappingURL=server.js.map