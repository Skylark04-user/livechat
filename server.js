const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { LiveChat } = require('youtube-chat');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const activeChats = new Map();

io.on('connection', (socket) => {
    socket.on('join-channel', (channelId) => {
        if (!channelId) return;

        // Jika channel belum dipantau, buat instance baru
        if (!activeChats.has(channelId)) {
            try {
                const isChannel = channelId.startsWith('UC');
                const liveChat = new LiveChat(isChannel ? { channelId } : { liveId: channelId });

                liveChat.on("chat", (chatItem) => {
                    let role = 'user';
                    if (chatItem.isOwner) role = 'owner';
                    else if (chatItem.isModerator) role = 'moderator';
                    else if (chatItem.isMembership) role = 'member';

                    io.to(channelId).emit('new-chat', {
                        id: chatItem.id,
                        username: chatItem.author.name,
                        avatar: chatItem.author.thumbnail.url,
                        message: chatItem.message.map(m => m.text || '').join(''),
                        role: role,
                        badgeUrl: chatItem.author.badge?.thumbnail?.url || ''
                    });
                });

                liveChat.on("error", () => {});
                liveChat.start().catch(() => {});

                activeChats.set(channelId, liveChat);
            } catch (e) {}
        }

        socket.join(channelId);
    });

    socket.on('send-test-chat', (data) => {
        io.emit('new-chat', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));