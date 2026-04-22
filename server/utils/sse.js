/**
 * SSE Utility - Server-Sent Events Manager
 */

let clients = [];

/**
 * Handle new SSE connection
 */
function handleConnection(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Send a keep-alive comment every 20 seconds to prevent timeout
  const keepAlive = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, 20000);

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res,
  };

  clients.push(newClient);
  console.log(`🔌 SSE Client connected: ${clientId} (Total: ${clients.length})`);

  req.on("close", () => {
    clearInterval(keepAlive);
    clients = clients.filter((c) => c.id !== clientId);
    console.log(`🔌 SSE Client disconnected: ${clientId} (Total: ${clients.length})`);
  });
}

/**
 * Send event to all connected clients
 */
function sendEvent(eventName, data) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((client) => client.res.write(payload));
}

module.exports = {
  handleConnection,
  sendEvent,
};
