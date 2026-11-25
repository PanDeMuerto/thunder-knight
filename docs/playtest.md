# Checkpoint: the Region 1 slice (your playtest)

The plan pauses here for you to play Battles 1–5 (milestones.md, after M8). Development carries on into Region 2 in
the meantime, as you asked, and your notes get folded in when they come. About 30–40 minutes.

## How to play it

- **Desktop:** `npm run dev`, then http://localhost:5180 (or the Browser pane's "knight" tab). A fresh browser profile
  or a private window starts you as a new player in Battle 1's lesson.
- **A phone, either way:**
  - Upload `release/thunder-knight-<version>-poki.zip` to Poki for Developers. Its Inspector shows a QR code for your
    phone, and the same upload is the Inspector run M5 is waiting on.
  - Or on your own Wi-Fi: `npm run build:itch`, then `npx vite preview --outDir dist-itch --host --port 5190`, and
    open the "Network" address it prints on the phone.
- Play once in **portrait** and once in **landscape** on the phone.

## What to look for

Write down anything, in any words. These are the questions the plan most needs answered:

1. **Battle 1, cold:** did you ever not know what to do? Did a prompt cover something you wanted to see?
2. **The look (M7):** the hero, Rosie, the soldiers, the field. Anything that looks wrong, busy or unclear?
3. **The sound (M8):** too loud, too quiet, annoying with repetition? The music: keep, swap (compare at
   http://localhost:5180/qa-output/music/index.html), or none?
4. **Difficulty:** where did you lose, or nearly? Was Sir Grudge fair? Did you ever run out of things to buy, or
   never have enough gold?
5. **Feel:** aiming and shooting with a mouse, and with your thumb. The camera in portrait.
6. **Ads (Poki build only):** did any offer feel pushy, or come at a bad moment?
7. **Anything you'd cut, or anything missing** before the game grows to four regions.

## Where your notes go

Paste them into the chat. They become a list in `docs/milestones.md` (under the checkpoint) and are folded into the
next milestones before more regions are built.
