var board = Chessboard('board', {
    position: 'start'
});

var socket = io();

function startGame() {
    socket.emit('start');
}

socket.on('move', function(data) {
    board.position(data.fen);
    document.getElementById('pgn').innerText = data.pgn;
});

socket.on('gameover', function(data) {
    document.getElementById('elo').innerText =
        "EngineA Elo: " + Math.round(data.elo.EngineA) +
        "\nEngineB Elo: " + Math.round(data.elo.EngineB);
});
