<template>
  <!-- Settings modal -->
  <Modal :is-open="is_modal_open" :close-modal="toggleModal">
    <Switch label="Force capture" v-model="settings.force_capture"></Switch>
    <Switch
      label="Allow backwards on first capture"
      v-model="settings.allow_backwards"
    ></Switch>
    <div class="about-text">
      Made with 🥚 by Zoren.
      <a
        href="https://github.com/keijeizei/cheggs"
        target="_blank"
        rel="noopener noreferrer"
        >GitHub</a
      >
    </div>
  </Modal>

  <div class="container">
    <div
      :class="{ 'current-player-container': true, shake: isContainerShaking }"
    >
      <template v-if="!winner">
        <div v-if="currentPlayer === 'white'" class="piece white"></div>
        <div v-else class="piece black"></div>
        <p>to move</p>
      </template>
      <template v-else>
        <div v-if="winner === 'white'" class="piece white"></div>
        <div v-else-if="winner === 'black'" class="piece black"></div>
        <p>wins!</p>
      </template>
    </div>
    <div class="taken-container">
      <div v-for="taken in blackScore" :key="taken" class="piece white"></div>
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
            @dragover.prevent
            @drop="handleCellClick(rowIndex, colIndex)"
          >
            <div
              v-if="egg && egg.color === 'white'"
              :class="{
                piece: true,
                white: true,
                'selected-piece': egg.is_selected,
              }"
              draggable="true"
              @dragstart="handleCellClick(rowIndex, colIndex)"
              @dragend="handleCellClick(rowIndex, colIndex)"
            ></div>
            <div
              v-else-if="egg && egg.color === 'black'"
              :class="{
                piece: true,
                black: true,
                'selected-piece': egg.is_selected,
              }"
              draggable="true"
              @dragstart="handleCellClick(rowIndex, colIndex)"
              @dragend="handleCellClick(rowIndex, colIndex)"
            ></div>
            <div
              v-else-if="
                board.selected_egg &&
                board.selected_egg.available_moves[rowIndex][colIndex]
              "
              class="piece available-move"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <div class="taken-container">
      <div v-for="taken in whiteScore" :key="taken" class="piece black"></div>
    </div>
    <button @click="toggleModal">Settings</button>
    <button :class="{ 'green-bg': winner }" @click="restartGame">
      Restart
    </button>
  </div>
  <vue3-snackbar bottom :duration="3000"></vue3-snackbar>
</template>

<script setup>
import { reactive, ref, watch } from "vue";
import { Vue3Snackbar } from "vue3-snackbar";
import { useSnackbar } from "vue3-snackbar";
import Modal from "./components/Modal.vue";
import Switch from "./components/Switch.vue";

const snackbar = useSnackbar();

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
    // moves are stored as 1, captures are stored as an array of coordinates
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
    this.getAvailableCaptures(
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

  /**
   * Get all available captures for the egg. Can be called recursively
   * @param {number} x - x position of the egg
   * @param {number} y - y position of the egg
   * @param {Array} previous_captures - Array of previous captures in the current sequence
   * @param {boolean} allow_backwards - Whether to allow backwards captures
   * @returns {Array} - Array of available captures
   */
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

  /**
   * Check if a capture is possible. Requires:
   * - A captured egg of the opponent's color on [capture.captured_x, capture.captured_y]
   * - An empty cell on [capture.x, capture.y]
   * @param {Object} capture - Object containing the x, y, captured_x, and captured_y of the capture
   * @returns {boolean} - Whether the capture is possible
   */
  isCapturePossible(capture) {
    const capturedEgg = board.getEggAt(capture.captured_x, capture.captured_y);
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
    this.reset();
  }

  reset() {
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

    // if the move is a capture (array), capture all the eggs to be captured
    if (Array.isArray(egg.available_moves[newX][newY])) {
      for (const captures of egg.available_moves[newX][newY]) {
        const capturedEgg = this.getEggAt(captures.x, captures.y);
        capturedEgg.is_captured = true;
        if (capturedEgg.color === "white") {
          blackScore.value++;
        } else {
          whiteScore.value++;
        }
        this.grid[captures.x][captures.y] = null;
      }
    }

    console.log(`(${egg.x_pos}, ${egg.y_pos}) - (${newX}, ${newY})`);

    egg.x_pos = newX;
    egg.y_pos = newY;

    this.grid[newX][newY] = egg;

    this.selected_egg.is_selected = false;
    this.selected_egg = null;
  }

  /**
   * Calculate all possible moves for the current player
   * @returns {Object} - Object containing the total number of available moves and captures
   */
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

    // delete all available moves if force capture is enabled and there are captures available
    if (settings.value.force_capture && total_captures > 0) {
      for (let egg of this.eggs) {
        if (egg.color === currentPlayer.value) {
          egg.available_moves = egg.available_moves.map((row) =>
            row.map((cell) => (cell === 1 ? null : cell))
          );
        }
      }
    }

    return { total_moves, total_captures };
  }

  checkForWinner() {
    let whiteEggs = this.eggs.filter((egg) => egg.color === "white");
    let blackEggs = this.eggs.filter((egg) => egg.color === "black");

    if (settings.value.win_by_capturing_all) {
      if (whiteEggs.length === 0) {
        return "black";
      } else if (blackEggs.length === 0) {
        return "white";
      }
    } else if (settings.value.win_by_promotion) {
      for (let egg of whiteEggs) {
        if (egg.x_pos === 0) {
          return "white";
        }
      }
      for (let egg of blackEggs) {
        if (egg.x_pos === MAX_ROWS - 1) {
          return "black";
        }
      }
    }
    return null;
  }
}

let board = reactive(new Board());
let currentPlayer = ref("white");
let whiteScore = ref(0);
let blackScore = ref(0);
let winner = ref(null);

let isContainerShaking = ref(false);

let settings = ref({
  force_capture: false,
  win_by_capturing_all: false,
  win_by_promotion: true,
  allow_backwards: false,
});

let is_modal_open = ref(false);

// recalculate available moves when the settings change
watch(
  settings,
  () => {
    board.calculateAllPossibleMoves();
  },
  { deep: true }
);

const handleCellClick = (rowIndex, colIndex) => {
  if (winner.value) return;

  const selected_egg = board.getEggAt(rowIndex, colIndex);

  if (selected_egg) {
    // SELECTING AN EGG
    if (selected_egg.color !== currentPlayer.value) {
      shakeContainer();
      return;
    }

    board.selectEgg(selected_egg);
  } else if (board.selected_egg) {
    // MAKING A MOVE
    // check if the move is valid based on the available moves
    if (!board.selected_egg.available_moves[rowIndex][colIndex]) {
      return;
    }

    // make the move
    board.moveEgg(board.selected_egg, rowIndex, colIndex);

    // check for winner
    let possible_winner = board.checkForWinner();
    if (possible_winner) {
      winner.value = possible_winner;
      snackbar.add({
        type: "info",
        text: "Game over",
        dismissible: false,
      });
      return;
    }

    currentPlayer.value = getOtherColor(currentPlayer.value);

    // calculate all moves of the next player
    let { total_moves, total_captures } = board.calculateAllPossibleMoves();

    // declare winner if the other player has no moves left
    if (total_moves + total_captures === 0) {
      winner.value = currentPlayer.value === "white" ? "black" : "white";
      return;
    }
  }
};

const restartGame = () => {
  board.reset();
  currentPlayer.value = "white";
  whiteScore.value = 0;
  blackScore.value = 0;
  winner.value = null;
  board.calculateAllPossibleMoves();
  console.log("Game restarted");
  snackbar.add({
    type: "info",
    text: "Game restarted",
    dismissible: false,
  });
};

const checkIfCoordInBoard = (coords) => {
  return (
    coords.x >= 0 && coords.x < MAX_ROWS && coords.y >= 0 && coords.y < MAX_COLS
  );
};

const getOtherColor = (color) => (color === "white" ? "black" : "white");

const toggleModal = () => {
  is_modal_open.value = !is_modal_open.value;
};

const shakeContainer = () => {
  isContainerShaking.value = true;
  setTimeout(() => {
    isContainerShaking.value = false;
  }, 500);
};

// ================================ GAME START ================================
board.calculateAllPossibleMoves();
</script>

<style scoped>
p {
  font-family: sans-serif;
}

button {
  width: 320px;
  margin: 3px;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  background-color: #ccc;
  color: #232323;
  font-size: 16px;
  cursor: pointer;
}

button:hover {
  color: white;
  background-color: #eca075;
}

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 90vh;
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

.taken-container .piece,
.current-player-container .piece {
  filter: brightness(1.1);
}

.white {
  background: radial-gradient(circle, #f9faf7, #9fa2a8 80%, #733625 100%);
}

.black {
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
  flex-wrap: wrap;
  gap: 5px;
  justify-content: center;
  width: 320px;
  min-height: 40px;
  margin: 10px;
  padding: 5px;
  /* background-color: #ccc; */
  border: 1px solid #ccc;
  border-radius: 8px;
  /* box-shadow: inset 0 0 10px #aaa; */
}

.about-text {
  margin-top: 20px;
  font-size: 14px;
  text-align: center;
  color: white;
  font-family: sans-serif;
}

.about-text a {
  color: white;
  text-decoration: underline;
}

/* COLORS */
.green-bg {
  background-color: #71e382;
}

/* EFFECTS */
.shake {
  animation: shakeAnimation 0.5s;
}

@keyframes shakeAnimation {
  0% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px);
  }
  50% {
    transform: translateX(5px);
  }
  75% {
    transform: translateX(-5px);
  }
  100% {
    transform: translateX(0);
  }
}
</style>
