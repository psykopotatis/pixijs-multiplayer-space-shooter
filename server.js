var io = require('socket.io')();

var users = [];

// wait for a connection
io.on('connection', function (socket) {
    console.log('user connected!');

    // sending userId to the client
    // socket.emit('hello', userId);
    // and all other connected users
    socket.emit('users', users);

    socket.on('register', function (userData) {
        console.log('user register', userData);
        // sending to all clients except sender
        socket.broadcast.emit('new_user', userData);

        users.push(userData);
    });

    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
});

console.log('listening on: 2000');
io.listen(2000);