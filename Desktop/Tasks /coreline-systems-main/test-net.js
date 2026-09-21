const net = require('net');

const server = net.createServer((socket) => {
  socket.write('Echo server\r\n');
  socket.pipe(socket);
});

server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  console.log(`Server listening on ${address.address}:${address.port}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});