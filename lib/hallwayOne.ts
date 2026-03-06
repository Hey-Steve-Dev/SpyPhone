export const hallwayOneEmpty = require("@/assets/cams/hallway1/empty.png");

export const hallwayOneGuards = [
  require("@/assets/cams/hallway1/guard-back-and-forth.mp4"),
  require("@/assets/cams/hallway1/guard-walking-back.mp4"),
  require("@/assets/cams/hallway1/guard-standing.mp4"),
];

export function pickRandomHallwayOneClip() {
  const index = Math.floor(Math.random() * hallwayOneGuards.length);
  return hallwayOneGuards[index];
}
