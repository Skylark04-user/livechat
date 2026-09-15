const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { LiveChat } = require('youtube-chat');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const activeTrackers = new Map();

io.on('connection', (socket) => {
    // Menerima target channel / handle dari client (yang dibaca dari file JSON)
    socket.on('join-stream', (target) => {
        if (!target) return;

        const cleanTarget = target.replace('@', '');
        socket.join(cleanTarget);
        console.log(`OBS terhubung melacak channel: ${cleanTarget}`);

        if (!activeTrackers.has(cleanTarget)) {
            try {
                // Mendukung channelId (UC...) atau handle langsung
                const isChannelId = cleanTarget.startsWith('UC');
                const liveChat = new LiveChat(isChannelId ? { channelId: cleanTarget } : { channelId: cleanTarget });

                liveChat.on("chat", (chatItem) => {
                    let role = 'user';
                    if (chatItem.isOwner) role = 'owner';
                    else if (chatItem.isModerator) role = 'moderator';
                    else if (chatItem.isMembership) role = 'member';

                    io.to(cleanTarget).emit('new-chat', {
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

                activeTrackers.set(cleanTarget, liveChat);
            } catch (err) {
                console.error("Gagal melacak live chat:", err);
            }
        }
    });

    // Simulasi Tes Manual (Tombol T di keyboard)
    socket.on('send-test-chat', (data) => {
        io.emit('new-chat', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server aktif di port ${PORT}`);
});
