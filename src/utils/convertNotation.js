const ROW_MAP = [6, 5, 4, 3, 2, 1];
const COL_MAP = ["a", "b", "c", "d", "e"];

export const convertCoordToNotation = (x, y) => {
  return `${COL_MAP[y]}${ROW_MAP[x]}`;
};
