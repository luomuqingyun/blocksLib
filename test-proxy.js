const http = require('http');

const server = http.createServer((req, res) => {
    console.log('--- NEW REQUEST ---');
    console.log(`${req.method} ${req.url}`);
    console.log('HEADERS:', req.headers);

    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
        console.log('BODY:', body.substring(0, 500) + (body.length > 500 ? '...' : ''));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            id: 'chatcmpl-test',
            object: 'chat.completion',
            created: Date.now(),
            model: 'test',
            choices: [{
                index: 0,
                message: { role: 'assistant', content: 'This is a test response' },
                finish_reason: 'stop'
            }]
        }));
    });
});

server.listen(9999, () => {
    console.log('Test proxy listening on port 9999');
});
