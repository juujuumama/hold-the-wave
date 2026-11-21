// red wave (2026) by juujuumama: the pieces that appear in the app.
// chosen because the tide reads as water (waves, foam, rooms with the sea coming in).
// `phase` pins a piece to part of the cycle: calm | rising | crest | release.
// `focus` (0–1) is which part of the image to keep when it's cropped wide: 0 top, 1 bottom.
export const ART = [
  { src: 'art/lighthouse-1.jpg', title: 'lighthouse 1', phase: 'calm', focus: 0.02 },
  { src: 'art/harbor-is-full.jpg', title: 'harbor is full', phase: 'calm', focus: 0.45 },
  { src: 'art/house-on-a-hill-1.jpg', title: 'house on a hill 1', phase: 'calm', focus: 0.3 },
  { src: 'art/surface-weather-2.jpg', title: 'surface weather 2', phase: 'calm', focus: 0.4 },
  { src: 'art/airport-1.jpg', title: 'airport 1', phase: 'rising', focus: 0.4 },
  { src: 'art/airport-2.jpg', title: 'airport 2', phase: 'rising', focus: 0.45 },
  { src: 'art/bathroom-mirror-1.jpg', title: 'bathroom mirror 1', phase: 'rising', focus: 0.4 },
  { src: 'art/bathroom-mirror-2.jpg', title: 'bathroom mirror 2', phase: 'rising', focus: 0.35 },
  { src: 'art/family-dinner-1.jpg', title: 'family dinner 1', phase: 'crest', focus: 0.35 },
  { src: 'art/family-dinner-2.jpg', title: 'family dinner 2', phase: 'crest', focus: 0.35 },
  { src: 'art/bedtime-1.jpg', title: 'bedtime 1', phase: 'crest', focus: 0.35 },
  { src: 'art/bedtime-2.jpg', title: 'bedtime 2', phase: 'crest', focus: 0.35 },
  { src: 'art/home-interrupted-1.jpg', title: 'home interrupted 1', phase: 'crest', focus: 0.5 },
  { src: 'art/work-never-stops.jpg', title: 'work never stops', phase: 'crest', focus: 0.35 },
  { src: 'art/washing-dishes.jpg', title: 'washing dishes', phase: 'release', focus: 0.35 },
  { src: 'art/bathtime.jpg', title: 'bathtime', phase: 'release', focus: 0.35 },
  { src: 'art/suburbia-2.jpg', title: 'suburbia 2', phase: 'release', focus: 0.45 },
];
