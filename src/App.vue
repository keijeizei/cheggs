<template>
  <div class="container">
    <div class="current-player-container">
      <div v-if="currentPlayer === 1" class="piece player1"></div>
      <div v-else class="piece player2"></div>
      <p>'s turn</p>
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
        <div v-for="(row, rowIndex) in board" :key="rowIndex" class="row">
          <div
            v-for="(cell, colIndex) in row"
            :key="colIndex"
            class="cell"
            @click="handleCellClick(rowIndex, colIndex)"
          >
            <div
              v-if="cell === 1"
              :class="{
                piece: true,
                player1: true,
                'selected-piece': isSelectedPiece(rowIndex, colIndex),
              }"
            ></div>
            <div
              v-else-if="cell === 2"
              :class="{
                piece: true,
                player2: true,
                'selected-piece': isSelectedPiece(rowIndex, colIndex),
              }"
            ></div>
            <div
              v-else-if="availableMoves[rowIndex][colIndex]"
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
  </div>
</template>

<script setup>
import { ref } from "vue";

// 0 - invalid move | 1 - valid move | [[x, y], [x, y], ...] - valid move with capture(s)
const EMPTY_BOARD = [
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
];

const board = ref([
  [2, 2, 2, 2, 2],
  [2, 2, 2, 2, 2],
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1],
]);

const availableMoves = ref(structuredClone(EMPTY_BOARD));

let currentPlayer = ref(1);
let player1PiecesTaken = ref(0);
let player2PiecesTaken = ref(0);
let selectedPieceRow = ref(null);
let selectedPieceCol = ref(null);
let selectedPieceColor = ref(null);

const handleCellClick = (rowIndex, colIndex) => {
  const selectedPiece = board.value[rowIndex][colIndex];

  if (selectedPiece === 0) {
    // MAKING A MOVE - move the piece and remove capture pieces

    if (selectedPieceRow.value === null || selectedPieceCol.value === null) {
      return;
    }
    if (selectedPieceColor.value !== currentPlayer.value) {
      return;
    }
    if (availableMoves.value[rowIndex][colIndex] === 0) {
      return;
    }

    // DIAGONAL CAPTURE
    if (Array.isArray(availableMoves.value[rowIndex][colIndex])) {
      // remove all captured pieces and increment the pieces captured
      for (const [row, col] of availableMoves.value[rowIndex][colIndex]) {
        const jumpedPiece = board.value[row][col];

        if (jumpedPiece === 2) {
          player1PiecesTaken.value++;
        } else {
          player2PiecesTaken.value++;
        }

        board.value[row][col] = 0;
      }
    }

    // move the piece
    board.value[rowIndex][colIndex] = currentPlayer.value;
    board.value[selectedPieceRow.value][selectedPieceCol.value] = 0;

    // switch player
    currentPlayer.value = currentPlayer.value === 1 ? 2 : 1;

    // reset the selected piece coordinates
    selectedPieceRow.value = null;
    selectedPieceCol.value = null;
    availableMoves.value = structuredClone(EMPTY_BOARD);
  } else {
    // SELECTING A PIECE - find all possible moves

    if (selectedPiece !== currentPlayer.value) {
      return;
    }

    // set the selected piece coordinates
    selectedPieceRow.value = rowIndex;
    selectedPieceCol.value = colIndex;
    selectedPieceColor.value = selectedPiece;

    availableMoves.value = structuredClone(EMPTY_BOARD);

    // find all possible moves
    for (let i = 0; i < availableMoves.value.length; i++) {
      for (let j = 0; j < availableMoves.value[i].length; j++) {
        const direction = currentPlayer.value === 1 ? -1 : 1;

        // moving should only be forwards, diagonal or side
        const isAdjacent =
          (i - rowIndex === direction || i - rowIndex === 0) &&
          Math.abs(j - colIndex) <= 1;

        // first capture should be diagonally forwards only
        const isDiagonalJump =
          i - rowIndex === direction * 2 && Math.abs(j - colIndex) === 2;

        if (isAdjacent) {
          availableMoves.value[i][j] = 1;
        } else if (isDiagonalJump) {
          const capturedCoord = isCapturePossible(
            i,
            j,
            selectedPieceRow.value,
            selectedPieceCol.value
          );
          if (capturedCoord) {
            availableMoves.value[i][j] = [capturedCoord];
            // recursively find all possible multiple captures
            recursivelyCheckCapture(i, j, [capturedCoord]);
          }
        }
      }
    }
  }
};

/**
 * Recursively check for captures
 * If a capture is possible, push the captured piece to the availableMoves cell
 *
 * @param {number} row - the starting row
 * @param {number} col - the starting column
 * @param {array} captures - the array of captured coordinates
 */
const recursivelyCheckCapture = (row, col, captures) => {
  for (let i = 0; i < availableMoves.value.length; i++) {
    for (let j = 0; j < availableMoves.value[i].length; j++) {
      const isDiagonalJump = Math.abs(i - row) === 2 && Math.abs(j - col) === 2;

      if (!isDiagonalJump) continue;

      const capturedCoord = isCapturePossible(i, j, row, col);

      if (!capturedCoord) continue;

      const isAlreadyCaptured = captures.some(
        ([r, c]) => r === capturedCoord[0] && c === capturedCoord[1]
      );

      if (isAlreadyCaptured) continue;

      availableMoves.value[i][j] = [...captures, capturedCoord];
      recursivelyCheckCapture(i, j, [...captures, capturedCoord]);
    }
  }
};

/**
 * Check if a capture is possible and return the coordinates of the captured piece if so
 *
 * @param {number} start_row - the starting row position of the piece
 * @param {number} start_col - the starting column position of the piece
 * @param {number} end_row - the landing row position of the piece
 * @param {number} end_col - the landing column position of the piece
 */
const isCapturePossible = (start_row, start_col, end_row, end_col) => {
  const jumpedPieceRow = (start_row + end_row) / 2;
  const jumpedPieceCol = (start_col + end_col) / 2;
  const jumpedPiece = board.value[jumpedPieceRow][jumpedPieceCol];

  return Math.abs(start_row - end_row) === 2 &&
    Math.abs(start_col - end_col) === 2 &&
    jumpedPiece !== 0 &&
    jumpedPiece !== selectedPieceColor.value
    ? [jumpedPieceRow, jumpedPieceCol]
    : false;
};

const isSelectedPiece = (row, col) => {
  return selectedPieceRow.value === row && selectedPieceCol.value === col;
};
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
