<template>
  <div class="container">
    <div class="current-player-container">
      <template v-if="isGameOngoing">
        <div v-if="currentPlayer === 'white'" class="piece player1"></div>
        <div v-else class="piece player2"></div>
        <p>'s turn</p>
      </template>
      <template v-else>
        <div v-if="currentPlayer === 'black'" class="piece player1"></div>
        <div v-else class="piece player2"></div>
        <p>wins!</p>
      </template>
    </div>
    <div class="taken-container">
      <div
        v-for="taken in player2PiecesTaken"
        :key="taken"
        class="piece player1"
      ></div>
    </div>

    <div class="tray-container">
      <img src="/src/assets/tray.png" alt="tray" class="tray-bg" />
      <div class="tray">
        <div v-for="(row, rowIndex) in board.grid" :key="rowIndex" class="row">
          <div
            v-for="(egg, colIndex) in row"
            :key="colIndex"
            class="cell"
            @click="handleCellClick(rowIndex, colIndex)"
          >
            <div
              v-if="egg && egg.color === 'white'"
              :class="{
                piece: true,
                player1: true,
                'selected-piece': egg.is_selected,
              }"
            ></div>
            <div
              v-else-if="egg && egg.color === 'black'"
              :class="{
                piece: true,
                player2: true,
                'selected-piece': egg.is_selected,
              }"
            ></div>
            <div
              v-else-if="
                board.selected_egg &&
                board.selected_egg.available_moves[rowIndex][colIndex]
              "
              :class="{
                piece: true,
                'available-move': true,
              }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <div class="taken-container">
      <div
        v-for="taken in player1PiecesTaken"
        :key="taken"
        class="piece player2"
      ></div>
    </div>
    <Switch label="Force capture" v-model="settings.force_capture"></Switch>
    <Switch
      label="Allow backwards on first capture"
      v-model="settings.allow_backwards"
    ></Switch>
    <button @click="restartGame">Restart</button>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from "vue";
import Switch from "./components/Switch.vue";

const MAX_ROWS = 6;
const MAX_COLS = 5;
const NUM_EGGS = 10;

class Egg {
  constructor(color, x_pos, y_pos, is_captured = false) {
    this.color = color;
    this.x_pos = x_pos;
    this.y_pos = y_pos;
    this.is_selected = false;
    this.is_captured = is_captured;
    this.available_moves = Array(MAX_ROWS)
      .fill()
      .map(() => Array(MAX_COLS).fill(null));
  }

  resetAvailableMoves() {
    this.available_moves = Array(MAX_ROWS)
      .fill()
      .map(() => Array(MAX_COLS).fill(null));
  }

  getMoveAndCaptureCount() {
    let moves_count = 0;
    let captures_count = 0;
    for (let i = 0; i < MAX_ROWS; i++) {
      for (let j = 0; j < MAX_COLS; j++) {
        if (this.available_moves[i][j] === 1) {
          moves_count++;
        } else if (Array.isArray(this.available_moves[i][j])) {
          captures_count++;
        }
      }
    }
    return { moves_count, captures_count };
  }

  /**
   * Get all available moves and captures for the egg
   * @returns {Object} - Object containing the number of available moves and captures
   */
  getAvailableMoves() {
    if (this.is_captured) {
      return { moves_count: 0, captures_count: 0 };
    }

    this.resetAvailableMoves();

    // get available captures
    let captures = this.getAvailableCaptures(
      this.x_pos,
      this.y_pos,
      [],
      settings.value.allow_backwards
    );

    // get available moves
    let direction = this.color === "white" ? -1 : 1;
    let moves = [
      { x: this.x_pos + direction, y: this.y_pos - 1 },
      { x: this.x_pos + direction, y: this.y_pos },
      { x: this.x_pos + direction, y: this.y_pos + 1 },

      { x: this.x_pos, y: this.y_pos - 1 },
      { x: this.x_pos, y: this.y_pos + 1 },
    ];

    // filter out moves that are outside the grid and already occupied
    moves = moves.filter(
      (move) => checkIfCoordInBoard(move) && !board.getEggAt(move.x, move.y)
    );

    for (let move of moves) {
      this.available_moves[move.x][move.y] = 1;
    }

    return this.getMoveAndCaptureCount();
  }

  getAvailableCaptures(x, y, previous_captures = [], allow_backwards = false) {
    if (this.is_captured) {
      return [];
    }

    let direction = this.color === "white" ? -1 : 1;
    let capture_candidates = [
      {
        x: x + direction * 2,
        y: y - 2,
        captured_x: x + direction,
        captured_y: y - 1,
      },
      {
        x: x + direction * 2,
        y: y + 2,
        captured_x: x + direction,
        captured_y: y + 1,
      },
    ];

    if (allow_backwards) {
      capture_candidates.push(
        {
          x: x - direction * 2,
          y: y - 2,
          captured_x: x - direction,
          captured_y: y - 1,
        },
        {
          x: x - direction * 2,
          y: y + 2,
          captured_x: x - direction,
          captured_y: y + 1,
        }
      );
    }

    // filter out captures that are outside the grid
    capture_candidates = capture_candidates.filter(
      (capture) =>
        checkIfCoordInBoard(capture) && this.isCapturePossible(capture)
    );

    for (let capture of capture_candidates) {
      // skip if the capture has already been made in the current sequence
      if (
        previous_captures.some(
          (c) => c.x === capture.captured_x && c.y === capture.captured_y
        )
      ) {
        continue;
      }

      this.available_moves[capture.x][capture.y] = [
        ...previous_captures,
        { x: capture.captured_x, y: capture.captured_y },
      ];

      this.getAvailableCaptures(
        capture.x,
        capture.y,
        [
          ...previous_captures,
          { x: capture.captured_x, y: capture.captured_y },
        ],
        true
      );
    }

    return capture_candidates;
  }

  isCapturePossible(capture) {
    const capturedEgg = board.grid[capture.captured_x][capture.captured_y];
    const opponentColor = getOtherColor(this.color);

    return (
      capturedEgg &&
      capturedEgg.color === opponentColor &&
      board.grid[capture.x][capture.y] === null
    );
  }
}

class Board {
  constructor() {
    this.selected_egg = null;
    this.eggs = [];
    this.grid = Array(MAX_ROWS)
      .fill()
      .map(() => Array(MAX_COLS).fill(null));

    // initialize the board with eggs
    for (let i = 0; i < NUM_EGGS; i++) {
      let x_pos = Math.floor(i / MAX_COLS);
      let y_pos = i % MAX_COLS;

      let whiteEgg = reactive(new Egg("black", x_pos, y_pos));
      this.eggs.push(whiteEgg);
      this.grid[x_pos][y_pos] = whiteEgg;

      x_pos = MAX_ROWS - Math.floor(i / MAX_COLS) - 1;
      let blackEgg = reactive(new Egg("white", x_pos, y_pos));
      this.eggs.push(blackEgg);
      this.grid[x_pos][y_pos] = blackEgg;
    }
  }

  selectEgg(egg) {
    if (this.selected_egg) {
      this.selected_egg.is_selected = false;
    }
    this.selected_egg = egg;
    this.selected_egg.is_selected = true;
  }

  getEggAt(x, y) {
    return this.grid[x][y];
  }

  moveEgg(egg, newX, newY) {
    this.grid[egg.x_pos][egg.y_pos] = null;

    if (Array.isArray(egg.available_moves[newX][newY])) {
      for (const captures of egg.available_moves[newX][newY]) {
        const capturedEgg = this.getEggAt(captures.x, captures.y);
        capturedEgg.is_captured = true;
        if (capturedEgg.color === "white") {
          player2PiecesTaken.value++;
        } else {
          player1PiecesTaken.value++;
        }
        this.grid[captures.x][captures.y] = null;
      }
    }

    egg.x_pos = newX;
    egg.y_pos = newY;

    this.grid[newX][newY] = egg;

    this.selected_egg.is_selected = false;
    this.selected_egg = null;
  }

  calculateAllPossibleMoves() {
    let total_moves = 0;
    let total_captures = 0;
    for (let egg of this.eggs) {
      if (egg.color === currentPlayer.value) {
        const { moves_count, captures_count } = egg.getAvailableMoves();
        total_moves += moves_count;
        total_captures += captures_count;
      }
    }
    console.log(total_moves, total_captures);

    if (settings.value.force_capture && total_captures > 0) {
      for (let egg of this.eggs) {
        if (egg.color === currentPlayer.value) {
          egg.available_moves = egg.available_moves.map((row) =>
            row.map((cell) => (cell === 1 ? null : cell))
          );
          console.log(egg.available_moves);
        }
      }
    }
  }
}

let board = reactive(new Board());
console.log(board.grid);
console.log(board.eggs);

let currentPlayer = ref("white");
let player1PiecesTaken = ref(0);
let player2PiecesTaken = ref(0);
let isGameOngoing = ref(true);

let settings = ref({
  force_capture: false,
  win_by_capturing_all: false,
  allow_backwards: false,
});

// recalculate available moves when the settings change
watch(
  settings,
  () => {
    console.log("here");
    board.calculateAllPossibleMoves();
  },
  { deep: true }
);

const handleCellClick = (rowIndex, colIndex) => {
  if (!isGameOngoing.value) return;

  const selected_egg = board.grid[rowIndex][colIndex];

  if (selected_egg) {
    // SELECTING AN EGG
    if (selected_egg.color !== currentPlayer.value) {
      return;
    }

    board.selectEgg(selected_egg);
  } else if (board.selected_egg) {
    // MAKING A MOVE
    // check if the move is valid based on the available moves
    if (!board.selected_egg.available_moves[rowIndex][colIndex]) {
      return;
    }
    board.moveEgg(board.selected_egg, rowIndex, colIndex);
    currentPlayer.value = getOtherColor(currentPlayer.value);

    // calculate all moves of the next player
    board.calculateAllPossibleMoves();
  }
};

const restartGame = () => {
  board = reactive(new Board());
  currentPlayer.value = "white";
  player1PiecesTaken.value = 0;
  player2PiecesTaken.value = 0;
  isGameOngoing.value = true;
  board.calculateAllPossibleMoves();
};

const checkIfCoordInBoard = (coords) => {
  return (
    coords.x >= 0 && coords.x < MAX_ROWS && coords.y >= 0 && coords.y < MAX_COLS
  );
};

const getOtherColor = (color) => (color === "white" ? "black" : "white");

board.calculateAllPossibleMoves();
</script>

<style scoped>
p {
  font-family: sans-serif;
}

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 90vh;
}

.tray-container {
  /* display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px; */
}

.tray {
  margin: 5px 30px;
}

.tray-bg {
  width: 320px;
  height: 320px;
  position: absolute;
  z-index: -1;
}

.row {
  display: flex;
}

.cell {
  flex: 1;
  width: 50px;
  height: 50px;
  aspect-ratio: 1;
  border: 1px solid #00000000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.piece {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.tray .piece {
  box-shadow: 0 0 10px 0px rgba(0, 0, 0, 0.75);
}

.player1 {
  background: radial-gradient(circle, #f9faf7, #9fa2a8 80%, #733625 100%);
}

.player2 {
  background: radial-gradient(circle, #eca075, #b15434 80%, #733625 100%);
}

.selected-piece {
  opacity: 0.8;
}

.available-move {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #71e382;
}

.current-player-container {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 10px;
}

.taken-container {
  display: flex;
  gap: 5px;
  justify-content: center;
  width: 320px;
  height: 40px;
  margin: 10px;
  padding: 5px;
}
</style>
