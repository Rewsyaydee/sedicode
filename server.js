const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. Load the JSON
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'animation.json'), 'utf8'));

// 2. SMART DISCOVERY: Find where the frames are hidden
// This checks the most common places ASCII Motion saves them
const framesSource = data.frames || 
                     (data.layers && data.layers[0].frames) || 
                     (data.project && data.project.layers && data.project.layers[0].frames);

if (!framesSource) {
    console.error("❌ Could not find frames in the JSON! Here is what's inside the file:");
    console.log(Object.keys(data));
    process.exit(1);
}

// Helper: Convert Hex to ANSI
function hexToAnsi(hex) {
    if (!hex || hex === 'transparent') return '';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `\x1b[38;2;${r};${g};${b}m`;
}

function parseForegroundColors(frame) {
    const foreground = frame?.colors?.foreground;

    if (!foreground) return {};

    if (typeof foreground === 'string') {
        try {
            return JSON.parse(foreground);
        } catch {
            return {};
        }
    }

    return foreground;
}

function renderFrame(frame) {
    if (Array.isArray(frame.cells) && frame.cells.length > 0) {
        let frameString = '';
        const cells = frame.cells.sort((a, b) => a.y - b.y || a.x - b.x);
        let lastY = cells[0]?.y || 0;

        cells.forEach((cell) => {
            while (cell.y > lastY) {
                frameString += '\n';
                lastY++;
            }

            const colorCode = hexToAnsi(cell.fg);
            const reset = '\x1b[0m';
            frameString += `${colorCode}${cell.char || ' '}${reset}`;
        });

        return frameString;
    }

    const lines = Array.isArray(frame.content)
        ? frame.content
        : typeof frame.contentString === 'string'
            ? frame.contentString.split('\n')
            : [];

    const colors = parseForegroundColors(frame);

    if (!lines.length) return '';

    return lines
        .map((line, y) => {
            let renderedLine = '';

            for (let x = 0; x < line.length; x++) {
                const color = colors[`${x},${y}`];
                renderedLine += color ? `${hexToAnsi(color)}${line[x]}\x1b[0m` : line[x];
            }

            return renderedLine;
        })
        .join('\n');
}

// 3. Process the frames into terminal-ready strings
const processedFrames = framesSource.map((frame) => {
    return renderFrame(frame);
});

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    const userAgent = req.headers['user-agent'] || '';

    if (userAgent.includes('curl')) {
        res.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked'
        });

        let frameIndex = 0;
        const interval = setInterval(() => {
            // Clear screen and move cursor to top-left
            res.write('\x1b[2J\x1b[H' + processedFrames[frameIndex]);

            frameIndex++;
            if (frameIndex >= processedFrames.length) frameIndex = 0;
        }, 100); 

        req.on('close', () => clearInterval(interval));
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<h2>Run this in your terminal:</h2><code>curl http://${req.headers.host}</code>`);
    }
}).listen(PORT, () => {
    console.log(`✅ Server is live! Test it with: curl http://localhost:${PORT}`);
});