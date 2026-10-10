// server.js - Servidor WebSocket en Node.js
const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;

// Servidor HTTP base (health checks)
const httpServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', connections: wss.clients.size }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket Server activo. Conectese via ws://');
  }
});

// Servidor WebSocket sobre HTTP
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  const clientId = Date.now();
  const ip = req.socket.remoteAddress;
  console.log(`[${new Date().toISOString()}] Cliente conectado: ${clientId} desde ${ip}`);

  ws.send(JSON.stringify({
    tipo: 'bienvenida',
    mensaje: `Bienvenido al servidor WebSocket. Tu ID es: ${clientId}`,
    timestamp: new Date().toISOString()
  }));

  broadcast(wss, ws, JSON.stringify({
    tipo: 'sistema',
    mensaje: `Nuevo cliente conectado (ID: ${clientId})`,
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      console.log(`[MSG] Cliente ${clientId}: ${JSON.stringify(msg)}`);
      const respuesta = JSON.stringify({
        tipo: 'mensaje',
        clienteId: clientId,
        contenido: msg.texto || data.toString(),
        timestamp: new Date().toISOString()
      });
      broadcast(wss, null, respuesta);
    } catch (e) {
      ws.send(JSON.stringify({ tipo: 'error', mensaje: 'Formato JSON invalido' }));
    }
  });

  ws.on('close', (code) => {
    console.log(`[CLOSE] Cliente ${clientId} desconectado. Codigo: ${code}`);
    broadcast(wss, null, JSON.stringify({
      tipo: 'sistema',
      mensaje: `Cliente ${clientId} se desconecto`,
      timestamp: new Date().toISOString()
    }));
  });

  ws.on('error', (err) => console.error(`[ERROR] ${clientId}: ${err.message}`));
});

function broadcast(wss, excludeWs, message) {
  wss.clients.forEach(client => {
    if (client !== excludeWs && client.readyState === 1) {
      client.send(message);
    }
  });
}

httpServer.listen(PORT, () => {
  console.log(`Servidor WebSocket escuchando en puerto ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});