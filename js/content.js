// the words in the app. these are drafts. rewrite them in your own voice.

export const MANTRAS = {
  calm: [
    'clear water. this is the version of me who gets a vote.',
    'today i can decide. so today i write down what matters.',
    'the tide is out. i can see the shoreline clearly.',
    'leave a note for the harder days. they’ll need it.',
    'what feels true now is worth remembering later.',
  ],
  rising: [
    'feel it fully. decide it later.',
    'the swell is coming. i don’t have to swim out to meet it.',
    'nothing permanent during a temporary storm.',
    'urgent is a feeling, not a fact.',
    'i can notice everything and act on nothing.',
    'my future self deserves a vote.',
  ],
  crest: [
    'the wave is not the shore. don’t build anything on it.',
    'this is chemistry talking, not clarity.',
    'if it’s true now, it’ll still be true in ten days.',
    'i can write it. i don’t have to send it.',
    'not never. just not now.',
    'i don’t let the tide choose for me.',
    'pause is a decision too, and it’s the safe one.',
    'hold the wave. it always goes back out.',
    'i am not my worst day. i am the one who survives it.',
  ],
  release: [
    'the water is going out. let it.',
    'a few more days of gentle. then i decide.',
    'i held the wave. that counts.',
    'what’s still standing after the tide is what’s real.',
  ],
};

export const PRACTICES = {
  any: [
    { title: 'cold water', body: 'splash cold water on your face or hold something cold for 30 seconds. it slows your heart rate and gives your body a reset.' },
    { title: 'box breathing', body: 'breathe in for 4, hold for 4, out for 4, hold for 4. do four rounds. the long exhale tells your body it’s safe.' },
    { title: 'five things', body: 'name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste. come back to the room.' },
    { title: 'walk it out', body: 'ten minutes outside, no destination. let your body move what your mind can’t.' },
    { title: 'lower the bar', body: 'pick the one thing that has to happen today. everything else is optional. that’s allowed.' },
    { title: 'eat something real', body: 'blood sugar dips make everything louder. protein and something warm, if you can.' },
    { title: 'tell one person', body: 'text someone safe: “rough luteal day, no need to fix it, just wanted you to know.”' },
    { title: 'shrink the window', body: 'you don’t have to get through the week. just the next hour. then the next.' },
    { title: 'warm water', body: 'a bath or long shower. let the water be the gentle kind for a while.' },
    { title: 'empty your head', body: 'set a timer for 5 minutes and write everything, unedited. or put it in the vault.' },
  ],
  calm: [
    { title: 'write a letter', body: 'you’re clear right now. write a few lines for the you who’ll be on the wave. they’ll get it on a hard day.' },
    { title: 'fill in your scripts', body: 'decide now what you’ll say when you need to pause a big conversation. future you won’t have to find the words.' },
  ],
};

export const CATEGORIES = [
  ['relationship', 'end or change a relationship'],
  ['job', 'quit or blow up at work'],
  ['cutoff', 'cut someone off'],
  ['say', 'say something i can’t take back'],
  ['move', 'move or uproot my life'],
  ['money', 'make a big purchase or financial move'],
  ['body', 'change my body or appearance drastically'],
  ['quit', 'quit something i care about'],
  ['other', 'something else'],
  ['vent', 'nothing to decide, i just need to get it out'],
];

export const SCRIPTS = [
  'i want to talk about this properly, and i can’t do that well right now. can we come back to it next week?',
  'i’m having a hard hormonal week. i’m not ignoring this, i’m giving it the attention it deserves later.',
  'i need some space tonight. it’s not about you. i’ll reach out in a few days.',
  'can i sleep on this one? i’d rather give you a real answer than a fast one.',
  'i’m not making any big decisions this week. let’s revisit on [date].',
];

export const LETTER_PROMPTS = [
  'what do you know is true about your life right now?',
  'who loves you, and how do you know?',
  'what decision are you glad you didn’t make on the wave?',
  'what helps, even a little?',
  'what would you tell a friend on their worst day?',
  'what are you looking forward to after the tide goes out?',
];

export const WEIGHT = { 1: 'light', 2: 'okay', 3: 'heavy', 4: 'very heavy', 5: 'underwater' };

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export const mantraFor = (date, phase) => {
  const list = MANTRAS[phase] || MANTRAS.crest;
  return list[hash(date + phase) % list.length];
};

export const practiceFor = (date, phase, offset = 0) => {
  const list = [...(PRACTICES[phase] || []), ...PRACTICES.any];
  return list[(hash(date) + offset) % list.length];
};
