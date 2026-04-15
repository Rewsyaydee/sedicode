# ASCII Portfolio

Terminal ASCII animation streamed over HTTP for `curl`.

## What it does

- Serves the animation from `animation.json`
- Streams frames to terminal clients like `curl`
- Shows a simple HTML instruction page in browsers

## Requirements

- Node.js 18 or newer

## Run

```bash
npm start
```

Then open another terminal and run:

```bash
curl http://localhost:3000
```

## Project Files

- `server.js` - HTTP server and frame renderer
- `animation.json` - exported ASCII animation data
- `animation.txt` - source art reference
