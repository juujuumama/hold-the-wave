# hold the wave

a luteal phase companion for pmdd. *nothing permanent during a temporary storm.*

it predicts your hardest days and helps you hold off on all-or-nothing decisions until the wave passes. built around **red wave** (2026), a series by [juujuumama](https://juujuumama.art/project/red-wave) about living with premenstrual dysphoric disorder.

## what it does

- **today**: one red wave piece each day with a crimson tide drawn over it. the tide rises through the luteal phase and goes back out after your period starts. you also get a daily mantra, one small coping practice, and a "how heavy is today?" rating.
- **decision pause**: name the urge (quit, leave, cut them off…). during the wave it's held until day 4 of your period, then the app asks you again with a clear head: still true, it passed, or not sure. over time, **patterns** shows which urges pass with the wave and which keep coming back in clear water.
- **the vault**: write the text you shouldn't send, then seal it. it opens after the wave, and then you choose to keep it or release it.
- **letters**: on good days, write to the you who'll be on the wave. one shows up on the home screen each hard day.
- **cycle**: predictions from your logged periods, a phase strip, and the next 3 cycles. after 2+ cycles of daily ratings it learns *your* crest instead of assuming the week before your period.
- **help now**: 988 call/text and international helplines, one tap from every screen.

## privacy

everything is stored on the device (localStorage). no accounts, no server, no analytics. backups are a json file you download yourself.

## making it yours

| what | where |
| --- | --- |
| mantras, coping practices, scripts, letter prompts | `js/content.js` |
| the about page ("why i made this") | `about()` in `js/app.js` |
| artwork + titles (add `phase` to pin a piece to calm/rising/crest/release) | `art/art.js` + `art/*.jpg` |
| colors, fonts, torn paper edges | `css/style.css` (tokens at the top) |

after changing any files, bump `VERSION` in `sw.js` so installed copies update.

## running it

it's plain html/css/js with no build step. serve the folder with any static server:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## deploying

any static host works. two easy options:

- **vercel**: import the repo, framework preset "other", no build command. add a subdomain like `wave.juujuumama.art`.
- **github pages**: settings → pages → deploy from branch `main`, folder `/`.

it has to be served over https for offline support and "add to home screen" to work.

---

hold the wave is not medical advice or a substitute for care. artwork © juujuumama, all rights reserved.
