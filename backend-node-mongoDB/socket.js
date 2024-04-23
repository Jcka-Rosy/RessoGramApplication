const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const User = require('./models/User');
const mongoose = require('mongoose');
const ChatMessages = require('./models/ChatMessage');
const ChatRoom = require('./models/ChatRoom');
const Comment = require('./models/Comments');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: '*',
    }
});
// const roomId = 'room'
io.on('connection', (socket) => {
    console.log("Connection Test----->")

    // socket.on('join room', (groupName) => {
    //     console.log("MY ROOM--->", "groupName")
    //     socket.join(roomId);
    // });

    socket.on('send request', async ({ senderId, receiverId }) => {
        console.log("senderId", senderId, "receiverId", receiverId)
        try {
            const filteredFriendRequests = await User.aggregate([
                { $match: { _id: new mongoose.Types.ObjectId(receiverId) } },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'friendRequests.senderId',
                        foreignField: '_id',
                        as: 'senderInfo',
                    },
                },
                { $unwind: '$senderInfo' },
                {
                    $lookup: {
                        from: 'friendrequests',
                        localField: 'friendRequests.friendRequestId',
                        foreignField: '_id',
                        as: 'friendRequestsInfo',
                    },
                },
                { $unwind: '$friendRequestsInfo' },
                {
                    $facet: {
                        data: [
                            {
                                $match: { 'friendRequestsInfo.status': { $ne: 'Accepted' } },
                            },
                            {
                                $project: {
                                    _id: '$friendRequestsInfo.senderId',
                                    senderName: '$senderInfo.name',
                                    receiverId: '$friendRequestsInfo.friendRequestId',
                                    objectId: '$friendRequestsInfo._id',
                                    status: '$friendRequestsInfo.status',
                                    createdAt: '$friendRequestsInfo.createdAt',
                                },
                            },
                            {
                                $sort: { createdAt: -1 },
                            },
                        ],
                    },
                },
            ]);
            io.emit('receive request', filteredFriendRequests);
        } catch (error) {
            console.error('Error fetching friend requests:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    })

    socket.on('status', async ({ senderId, receiverId, status }) => {
        console.log("status", status, "senderId", senderId, "receiverId", receiverId)
        try {
            const user = await User.findById(receiverId).populate({
                path: 'friendsList',
                select: 'name',
            });

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const friends = user.friendsList.map(friendId => ({
                _id: friendId._id,
                name: friendId.name,
            }));

            io.emit('friends', friends)
        } catch (error) {
            console.error('Error fetching friends:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    })

    socket.on('status accept reject', async ({ senderId }) => {
        try {
            const existingUser = await User.findOne({ _id: senderId });

            const friendIds = existingUser.friendsList.map((friendId) => friendId.toString());
            const userSuggestions = await User.find({
                _id: { $ne: senderId, $nin: friendIds },
            })
                .populate({
                    path: 'friendRequests.friendRequestId',
                    select: 'senderId receiverId status',
                });
            const data = userSuggestions
            io.emit('get user friends', { data })
        } catch (error) {
            console.error('Error fetching user suggestions:', error);
        }
    })

    socket.on('unfriend', async ({ friendId, accountholder }) => {
        console.log("friendId", friendId, "accountholder", accountholder)
        try {
            const user = await User.findByIdAndUpdate(
                accountholder,
                { $pull: { friendsList: friendId } },
                { new: true }
            );

            await User.findByIdAndUpdate(
                friendId,
                { $pull: { friendsList: accountholder } },
                { new: true }
            );
            await user.save()
            io.emit('disconnectFriend')
        } catch (error) {
            console.error('Error disconnecting friend:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    })

    socket.on('friendTotalList', async ({ accountholder }) => {
        console.log("accountholder11", accountholder)
        try {
            const user = await User.findById(accountholder).populate({
                path: 'friendsList',
                select: 'name',
            });

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            console.log("user44444444", user)
            const friends = user.friendsList.map(friendId => ({
                _id: friendId._id,
                name: friendId.name,
            }));
            io.emit('disconnectFriendFromTotal', friends)
        } catch (error) {
            console.error('Error fetching friends:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    })

    socket.on('joinChatRoom', ({ roomId, userId }) => {
        console.log(`User ${userId} joined room ${roomId}`);
        socket.join(roomId);
    });

    socket.on('chatMessage', async ({ roomId, senderId, receiverId, content }) => {
        console.log("roomId", roomId, "senderId", senderId, "receiverId", receiverId, "content", content);
        try {
            const sender = await User.findById(senderId);
            const receiver = await User.findById(receiverId);

            if (!sender || !receiver) {
                console.error('Sender or receiver not found');
                return;
            }

            const message = new ChatMessages({
                messages: [{
                    sender: { id: senderId, name: sender.name },
                    receiver: { id: receiverId, name: receiver.name },
                    content: content,
                    timestamp: new Date(),
                    roomId: roomId,
                    viewed: false // Initially set viewed to false
                }]
            });

            await message.save();

            // Emit the message to all clients in the room
            io.to(roomId).emit('message', message);

            // Emit acknowledgment to sender that message has been delivered
            // socket.emit('messageDelivered', { messageId: message._id });

        } catch (error) {
            console.error(error);
        }
    });

    socket.on('seen message', async ({ roomId, userId, messageIds }) => {
        // Update the message's seenBy array in MongoDB
        console.log("messageId", messageIds)
        const seenMessages = await ChatMessages.updateOne(
            { 'messages.roomId': roomId, 'messages._id': { $in: messageIds } },
            { $addToSet: { 'messages.$.seenBy': userId } }
        );
        console.log("seenMessages", seenMessages)
        // Broadcast the updated message seen status to all participants
        io.to(roomId).emit('messageDelivered', { userId, messageIds });
    });

    // socket.on("markMessagesAsSeen", async ({ conversationId, userId }) => {
    //     try {
    //         await ChatMessages.updateMany({ roomId: conversationId, viewed: false }, { $set: { viewed: true } });
    //         await ChatRoom.updateOne({ roomId: conversationId }, { $set: { viewed : true } });
    //         io.to(userId).emit("messagesSeen", { conversationId });
    //     } catch (error) {
    //         console.log(error);
    //     }
    // });

    //     socket.on('newMessage', ({data, receiverId}) => {
    //     // Broadcast new message to all connected clients
    //     console.log("dataToday----------->", data, receiverId)
    //     console.log("HAPPY------------------>")
    //     io.to(receiverId).emit('newMessageNotification', data); // Use socket.emit instead of io.emit
    // });

    socket.on('newMessage', async ({ userId, receiverId }) => {
        console.log("userId, receiverId", userId, receiverId)
        try {
            // Count the number of messages where the given user ID is either the sender or receiver
            const messageCount = await ChatMessages.countDocuments({
                $or: [
                    { 'messages.sender.id': userId, 'messages.viewed': false },
                    { 'messages.receiver.id': userId, 'messages.viewed': false }
                ]
            });
            console.log("messagesToday--->", messageCount) //output messagesToday---> 1

            io.emit('unreadMessageCount', { messageCount, receiverId });
        } catch (error) {
            console.error('Error retrieving message count:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    socket.on('blockFriend', async ({ friendId }) => {
        try {
            // Implement block logic here, update database, etc.
            // For example:
            await User.findByIdAndUpdate(friendId, { blocked: true });

            // Inform frontend about the success of the block action
            socket.emit('friendBlocked', { friendId });
        } catch (error) {
            console.error('Error blocking friend:', error.message);
        }
    });

    // socket.on('new-comment', async ({ postId, content }) => {
    //     try {
    //       // Save the comment to the database
    //       const comment = await Comment.create({ postId, userId: socket.userId, content });
    //       // Emit the new comment to other clients viewing the same post
    //       socket.to(postId).emit('new-comment', comment);
    //     } catch (error) {
    //       console.error('Error saving comment:', error);
    //     }
    //   });

    // Handle disconnection

    socket.on("disconnect", (reason, details) => {
        // Log the reason of the disconnection
        console.log("Disconnect reason:", reason);
    
        // Check if the details object is defined before accessing its properties
        if (details) {
            // Log the low-level reason of the disconnection
            console.log("Disconnect message:", details.message);
    
            // Log some additional description
            console.log("Disconnect description:", details.description);
    
            // Log some additional context
            console.log("Disconnect context:", details.context);
        }
    });
})

module.exports = { io };
