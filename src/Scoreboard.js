const fs = require('fs');
const path = require('path');

class Scoreboard {
    constructor() {
        this.dataFile = path.join(__dirname, 'scoreboard.json');
        this.scores = this.loadScores();
    }

    loadScores() {
        try {
            if (fs.existsSync(this.dataFile)) {
                const data = fs.readFileSync(this.dataFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading scoreboard:', error);
        }
        return {};
    }

    saveScores() {
        try {
            fs.writeFileSync(this.dataFile, JSON.stringify(this.scores, null, 2));
        } catch (error) {
            console.error('Error saving scoreboard:', error);
        }
    }

    recordGameResult(winner, players) {
        const player1 = players[0];
        const player2 = players[1];

        // Initialize scores if not exists
        if (!this.scores[player1.username]) {
            this.scores[player1.username] = { wins: 0, losses: 0, draws: 0 };
        }
        if (!this.scores[player2.username]) {
            this.scores[player2.username] = { wins: 0, losses: 0, draws: 0 };
        }

        if (winner === 'draw') {
            this.scores[player1.username].draws++;
            this.scores[player2.username].draws++;
        } else {
            // Find winner and loser
            const winnerPlayer = players.find(p => p.role === winner);
            const loserPlayer = players.find(p => p.role !== winner);

            this.scores[winnerPlayer.username].wins++;
            this.scores[loserPlayer.username].losses++;
        }

        this.saveScores();
    }

    getPlayerStats(username) {
        return this.scores[username] || { wins: 0, losses: 0, draws: 0 };
    }

    getAllStats() {
        const stats = [];
        for (const [username, scores] of Object.entries(this.scores)) {
            const totalGames = scores.wins + scores.losses + scores.draws;
            const winRate = totalGames > 0 ? (scores.wins / totalGames * 100).toFixed(1) : 0;
            
            stats.push({
                username,
                ...scores,
                totalGames,
                winRate: parseFloat(winRate)
            });
        }

        // Sort by wins, then by win rate, then by total games
        return stats.sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            if (b.winRate !== a.winRate) return b.winRate - a.winRate;
            return b.totalGames - a.totalGames;
        });
    }

    getTopPlayers(limit = 10) {
        return this.getAllStats().slice(0, limit);
    }
}

module.exports = Scoreboard;


