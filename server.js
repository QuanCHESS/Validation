const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');
const { spawn } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let game = new Chess();
let elo = {
    EngineA: 1500,
    EngineB: 1500
};

function updateElo(result) {
    let K = 20;
    let Ra = elo.EngineA;
    let Rb = elo.EngineB;
    let Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
    let Sa = result;
    elo.EngineA = Ra + K * (Sa - Ea);
    elo.EngineB = Rb + K * ((1 - Sa) - (1 - Ea));
}

function startGame(socket) {
    game.reset();

    const engineA = spawn('stockfish');
    const engineB = spawn('stockfish');

    engineA.stdin.write('uci\n');
    engineB.stdin.write('uci\n');

    let currentEngine = engineA;

    function playMove() {
        currentEngine.stdin.write('position fen ' + game.fen() + '\n');
        currentEngine.stdin.write('go depth 12\n');
    }

    engineA.stdout.on('data', (data) => handleEngine(data, engineA));
    engineB.stdout.on('data', (data) => handleEngine(data, engineB));

    function handleEngine(data, engine) {
        const text = data.toString();
        if (text.includes('bestmove')) {
            let move = text.split('bestmove ')[1].split(' ')[0];
            game.move(move, { sloppy: true });

            socket.emit('move', {
                fen: game.fen(),
                pgn: game.pgn()
            });

            if (game.isGameOver()) {
                let result = game.result() === '1-0' ? 1 : 0;
                updateElo(result);
                socket.emit('gameover', { elo });
                engineA.kill();
                engineB.kill();
                return;
            }

            currentEngine = (engine === engineA) ? engineB : engineA;
            playMove();
        }
    }

    playMove();
}

io.on('connection', (socket) => {
    socket.on('start', () => startGame(socket));
});

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
