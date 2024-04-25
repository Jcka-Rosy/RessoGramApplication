const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http'); // Import http module
// const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app); // Create an http server and pass the Express app to it
const { io } = require('./socket');
// const io = new Server(server); // Attach the Socket.IO server to the http server

// Middleware
const corsOptions = {
    credentials: true,
    origin: "*",
};
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
// server = require('http').Server(app),
io.attach(server);
// MongoDB connection
// mongoose.connect('mongodb://localhost:27017/mern-auth', { useNewUrlParser: true, useUnifiedTopology: true });
// mongodb+srv://jesicarosy157:<password>@cluster0.ipih3bi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
mongoose.connect('mongodb+srv://jesicarosy157:NlAPRlw84aSsvdpI@cluster0.ipih3bi.mongodb.net/social_media', { useNewUrlParser: true, useUnifiedTopology: true })
    .then((res) => console.log('Connect')).catch((er) => console.log('not Connect', er.message))

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/friends', require('./routes/friends'));
app.use("/posted-images", express.static(__dirname + "/uploads/post"));
app.use("/posted-profile", express.static(__dirname + "/uploads/profile"));

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