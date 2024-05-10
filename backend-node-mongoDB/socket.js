const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const User = require('./models/User');
const mongoose = require('mongoose');
const ChatMessages = require('./models/ChatMessage');
const Post = require('./models/Post');
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: '*',
    }
});
io.on('connection', (socket) => {
    console.log("Connection Test----->")

    socket.on('send request', async ({ senderId, receiverId }) => {
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
        try {
            const user = await User.findById(accountholder).populate({
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
            io.emit('disconnectFriendFromTotal', friends)
        } catch (error) {
            console.error('Error fetching friends:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    })

    socket.on('joinChatRoom', ({ roomId, userId }) => {
        socket.join(roomId);
    });

    socket.on('chatMessage', async ({ roomId, senderId, receiverId, content }) => {
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
                    viewed: false
                }]
            });
            await message.save();
            io.to(roomId).emit('message', message);
            // socket.emit('messageDelivered', { messageId: message._id });
        } catch (error) {
            console.error(error);
        }
    });

    socket.on('sharedImageData', async ({ roomId, imageId, userId, friendIds }) => {
        try {
            const sender = await User.findById(userId);
            const friend = await User.findById(friendIds);
            const ImageDetails = await Post.findById(imageId);

            const newMessage = {
                sender: {
                    id: sender._id,
                    coverImage: sender.coverImage,
                    name: sender.name
                },
                receiver: {
                    id: friend._id,
                    coverImage: friend.coverImage,
                    name: friend.name
                },
                sharedImage: {
                    imageId: {
                        file: {
                            fileName: ImageDetails.file.fileName,
                            filePath: ImageDetails.file.filePath,
                            fileType: ImageDetails.file.fileType
                        },
                        _id: imageId
                    },
                    userId: userId,
                    friendIds: friend._id
                },
                roomId: roomId,
                timestamp: new Date(),
                viewed: false
            };

            const message = new ChatMessages({ messages: [newMessage] });
            const savedMessage = await message.save();

            io.to(roomId).emit('imageShared', savedMessage);
        } catch (error) {
            console.error('Error saving shared image data to ChatMessages:', error);
        }
    });

    socket.on('seen message', async ({ roomId, userId, messageIds }) => {
        const seenMessages = await ChatMessages.updateOne(
            { 'messages.roomId': roomId, 'messages._id': { $in: messageIds } },
            { $addToSet: { 'messages.$.seenBy': userId } }
        );
        io.to(roomId).emit('messageDelivered', { userId, messageIds });
    });

    socket.on('newMessage', async ({ userId, receiverId }) => {
        try {
            // Count the number of messages where the given user ID is either the sender or receiver
            const messageCount = await ChatMessages.countDocuments({
                $or: [
                    { 'messages.sender.id': userId, 'messages.viewed': false },
                    { 'messages.receiver.id': userId, 'messages.viewed': false }
                ]
            });
            io.emit('unreadMessageCount', { messageCount, receiverId });
        } catch (error) {
            console.error('Error retrieving message count:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    socket.on('blockFriend', async ({ friendId }) => {
        try {
            // Implement block logic here, update database, etc.
            await User.findByIdAndUpdate(friendId, { blocked: true });

            // Inform frontend about the success of the block action
            socket.emit('friendBlocked', { friendId });
        } catch (error) {
            console.error('Error blocking friend:', error.message);
        }
    });

    socket.on("disconnect", (reason, details) => {
        console.log("Disconnect reason:", reason);
        if (details) {
            console.log("Disconnect message:", details.message);
            console.log("Disconnect description:", details.description);
            console.log("Disconnect context:", details.context);
        }
    });
})

module.exports = { io };