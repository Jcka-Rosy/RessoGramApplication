const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http'); // Import http module
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app); // Create an http server and pass the Express app to it
const io = new Server(server); // Attach the Socket.IO server to the http server

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/mern-auth', { useNewUrlParser: true, useUnifiedTopology: true });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/friends', require('./routes/friends'));

// WebSocket handling
// io.on('connection', (socket) => {
//   console.log('A user connected');

//   socket.on('friendRequest', (data) => {
//     // Broadcast the friend request to other connected users
//     socket.broadcast.emit('friendRequest', data);
//   });

//   socket.on('disconnect', () => {
//     console.log('User disconnected');
//   });
// });

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));