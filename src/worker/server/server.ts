
import fs from 'fs';
import path from 'path';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { WorkerBuildStep, WorkerFileUpdate } from '../../common/workertypes';
import { ServerBuildEnv, TOOLS, findBestTool } from './buildenv';

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

const app = express();

app.use(cors());

app.use(express.json({ limit: 1024*1024 })); // limit 1 MB
app.use(express.text({ limit: 1024*1024 })); // limit 1 MB for text files
app.use(express.urlencoded({ extended: true, limit: 1024*1024 })); // for FormData

app.get('/info', (req: Request, res: Response) => {
    // send a list of supported tools
    res.json({ tools: TOOLS });
});

app.get('/test1', async (req: Request, res: Response, next) => {
    // quick test of the build
    try {
        const updates: WorkerFileUpdate[] = [{ path: 'test.c', data: 'int main() { return 0; }' }];
        const buildStep: WorkerBuildStep = { tool: 'llvm-mos', platform: 'c64', files: ['test.c'] };
        const env = new ServerBuildEnv(SERVER_ROOT, 'test', TOOLS[0]);
        const result = await env.compileAndLink(buildStep, updates);
        res.json(result);
    } catch (err) {
        return next(err);
    }
});

app.get('/test2', async (req: Request, res: Response, next) => {
    // quick test of the build
    try {
        const updates: WorkerFileUpdate[] = [{ path: 'test.c', data: 'int main() { return 0; }' }];
        const buildStep: WorkerBuildStep = { tool: 'oscar64', platform: 'c64', files: ['test.c'] };
        const env = new ServerBuildEnv(SERVER_ROOT, 'test', TOOLS[1]);
        const result = await env.compileAndLink(buildStep, updates);
        res.json(result);
    } catch (err) {
        return next(err);
    }
});

app.post('/build', async (req: Request, res: Response, next) => {
    try {
        const updates: WorkerFileUpdate[] = req.body.updates;
        const buildStep: WorkerBuildStep = req.body.buildStep;
        const sessionID = req.body.sessionID;
        const bestTool = findBestTool(buildStep);
        const env = new ServerBuildEnv(SERVER_ROOT, sessionID, bestTool);
        const result = await env.compileAndLink(buildStep, updates);
        res.json(result);
    } catch (err) {
        return next(err);
    }
});

// Save user files for jsbeeb loadBasic parameter
app.post('/userfile', (req: Request, res: Response, next) => {
    try {
        const { content, session, file } = req.body;
        
        if (!content || !session || !file) {
            return res.status(400).json({ error: 'Missing parameters' });
        }
        
        const sessionPath = path.join(SESSION_ROOT, session);
        
        // Create session directory if it doesn't exist
        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }
        
        const filePath = path.join(sessionPath, file);
        
        // Security check: ensure the file is within the session directory
        if (!filePath.startsWith(sessionPath)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        // Write the file content
        fs.writeFileSync(filePath, content, 'utf8');
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.json({ success: true, path: filePath });
        
    } catch (err) {
        return next(err);
    }
});

// Serve user files for jsbeeb loadBasic parameter
app.get('/userfile/:sessionID/:filename', (req: Request, res: Response, next) => {
    try {
        const { sessionID, filename } = req.params;
        const sessionPath = path.join(SESSION_ROOT, sessionID);
        const filePath = path.join(sessionPath, filename);
        
        // Security check: ensure the file is within the session directory
        if (!filePath.startsWith(sessionPath)) {
            return res.status(403).send('Access denied');
        }
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('File not found');
        }
        
        // Set appropriate headers for BASIC files
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
    } catch (err) {
        return next(err);
    }
});

// Catch errors
app.use((err: Error, req: Request, res: Response, next: Function) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start the server
const port = 3009;

/*{
    origin: [`http://localhost:${port}`, 'http://localhost:8000']
}));*/

const SERVER_ROOT = process.env['_8BITWS_SERVER_ROOT'] || path.resolve('./server-root');
const SESSION_ROOT = path.join(SERVER_ROOT, 'sessions');
if (!fs.existsSync(SESSION_ROOT)) {
    fs.mkdirSync(SESSION_ROOT);
}
process.chdir(SESSION_ROOT);

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
