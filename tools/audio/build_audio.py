"""Cuts the game's sounds and music from the owner's library into public/assets/audio/*.mp3. Run with `npm run audio`.

MP3 because every browser decodes it. Effects are short, mono and levelled to a loudness each, so the volumes in
src/audio/audio.ts are the real mix. Frequent sounds (coins, hits, bolts) are short and quiet on purpose (the owner's
standing taste). Music is stereo: Ovani's 60-second cuts with their reverb tail laid over the start, so each loops
without a seam.

`python tools/audio/build_audio.py --candidates` also writes the music candidates for the owner to choose by ear
(qa-output/music/, opened through the dev server at /qa-output/music/index.html; never shipped).

Sources (licences in docs/credits.md): Ovani Sound packs (commercial games, no credit, never as files on their own),
Pizza Doggy's Echoes Audio Super Kit (any game, credit appreciated) and Kenney's CC0 packs. Set FFMPEG if ffmpeg isn't
at C:/SOFT/Shotcut/ffmpeg.exe, and ASSET_LIBRARY if the library isn't in C:/PROJECTS/ASSETS.
"""

import fnmatch
import json
import os
import subprocess
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
LIBRARY = os.environ.get("ASSET_LIBRARY", "C:/PROJECTS/ASSETS")
FFMPEG = os.environ.get("FFMPEG", "C:/SOFT/Shotcut/ffmpeg.exe")
TAR = "C:/Windows/System32/tar.exe" if os.name == "nt" else "tar"
CACHE = os.path.join(ROOT, ".cache", "vendor-audio")
OUT = os.path.join(ROOT, "public", "assets", "audio")
CANDIDATES = os.path.join(ROOT, "qa-output", "music")

ACTION = "SFX/Hollywood Action Sound FX Pack Vol. 2.zip::"
CASUAL = "SFX/Casual & Mobile Sound FX Pack Vol. 1.zip::"
JINGLES = "SFX/Jingles & Stingers Sound FX Pack Vol. 2.zip::"
IMPACTS = "SFX/Foley Impacts Vol. 1.zip::"
FIRE = "SFX/Fire Sound FX Pack Vol. 1.zip::"
AMBIENCES = "SFX/Environment Ambiences Sound FX Pack Vol. 1.zip::"
CLASSICAL = "SFX/Classical Music Pack Vol. 2.zip::"
ORCH = "SFX/Orchestral Ambient Music Pack Vol. 1.zip::"
ECHOES = "PSX SHIT/pizzadoggy assets/Echoes - Audio Super Kit/Audio/SFX/"
KENNEY_IMPACT = "SFX/CC0/cc0-sounds-web/kenney_impactsounds/Audio/"

# name: (source, start seconds, length seconds, loudness target in LUFS). Leading silence is trimmed first.
EFFECTS = {
    # Guns: punchy and short, one per gun model (GDD §17).
    "pistol": (ACTION + "*Firearms/Light/Pistol Single 001.wav", 0, 0.6, -15),
    "shotgun": (ACTION + "*Firearms/Light/Shotgun Single 001.wav", 0, 0.85, -14),
    "smg": (ACTION + "*Firearms/Light/Punchy Shot Single 004.wav", 0, 0.3, -16),
    # Region 2's rifles (M9): the assault rifle's crack and the hunting rifle's heavy boom.
    "rifle": (ACTION + "*Firearms/Light/Assault Rifle Semi-Automatic 001.wav", 0, 0.32, -15),
    "hunting": (ECHOES + "Guns/sniper_rifle_1.ogg", 0, 1.0, -14),
    "reload": (ACTION + "*Firearms/Mechanics/Gun Mechanics 001.wav", 0, 0.7, -21),
    # Hits: a soft tick on cloth, a light clink on armour, a body flopping onto grass when knocked out.
    "hit": (ECHOES + "Misc/hit_2.ogg", 0, 0.2, -22),
    "clink": (KENNEY_IMPACT + "impactPlate_light_000.ogg", 0, 0.25, -22),
    "knock": (IMPACTS + "*Fall Grass A.wav", 0, 0.5, -20),
    # Knocked-out soldiers yelp a little comically (a few voices, pitched in the game; at most 4 a second).
    "yelp0": (CASUAL + "*Gasp A.wav", 0, 0.6, -23),
    "yelp1": (CASUAL + "*Gasp B.wav", 0, 0.6, -23),
    "yelp2": (CASUAL + "*Ahhh.wav", 0, 0.8, -23),
    "yelp3": (CASUAL + "*Faint.wav", 0, 0.8, -23),
    "yelp4": (ACTION + "*Voice A Pain Grunt 001.wav", 0, 0.6, -24),
    # Gold: a soft tick whose pitch climbs within a combo (in the game). Quiet: it's frequent.
    "coin": (CASUAL + "*Plink.wav", 0, 0.18, -26),
    # Grenades.
    "throw": (ECHOES + "Player/Misc/throw_1.ogg", 0, 0.4, -23),
    "blast": (ECHOES + "Explosions/explosion_1.ogg", 0, 1.3, -16),
    # The shop: a click, the purchase, the crate dropping out of the rift and landing.
    "click": (CASUAL + "*Woody Clicks.wav", 0, 0.15, -24),
    "buy": (CASUAL + "*Power Up Grab A.wav", 0, 0.8, -19),
    "rift": (CASUAL + "*Power Up Charge.wav", 0, 1.0, -22),
    "crate": (IMPACTS + "*Fall Wood A.wav", 0, 0.5, -19),
    # Battle beats: the Baron's horn as a wave comes, war drums under the army reveal, Larkmoor's horn when a captain's
    # squad routs, a sting for a cleared wave, a warning when they reach the banner, the boss's menace, win and loss.
    "horn": (JINGLES + "*Horn Gloomy.wav", 0, 4.0, -18),
    "drums": (JINGLES + "*Drums Warfare A.wav", 0, 4.0, -18),
    "rout": (JINGLES + "*Horn Mountain Call A.wav", 0, 3.0, -19),
    "waveClear": (JINGLES + "*Orchestral Stage Complete.wav", 0, 4.0, -18),
    "alarm": (JINGLES + "*Perc Warning A.wav", 0, 2.0, -19),
    "menace": (JINGLES + "*Orchestral Menace.wav", 0, 4.0, -17),
    "fanfare": (JINGLES + "*Orchestral Victory A.wav", 0, 5.0, -16),
    "defeat": (JINGLES + "*Orchestral Fail A.wav", 0, 4.0, -18),
    # Archers loose with a soft "thwip" (quiet, frequent).
    "bolt": (CASUAL + "*Bow A.wav", 0.2, 0.25, -25),
    # Shields: a bullet clonks on a tower shield; it cracks; a grenade splinters it.
    "block": (KENNEY_IMPACT + "impactMetal_heavy_000.ogg", 0, 0.35, -20),
    "crack": (ECHOES + "Misc/crack_1_wood.ogg", 0, 0.5, -19),
    "splinter": (ACTION + "*Wooden Box Destruction 001.wav", 0, 1.0, -18),
    # Sir Grudge: the charge's wind-up roar (pitched down in the game) and his fall.
    "windup": (ACTION + "*Voice C Attack Grunt 001.wav", 0, 1.0, -17),
    "bossDown": (ACTION + "*Epic Landing 001.wav", 0, 1.6, -16),
    # The hero is hit: a soft thump, never a cry.
    "hurt": (IMPACTS + "*Beefy Punch A.wav", 0, 0.3, -20),
    # Region 2 (M9). The firebrand's "aaah!" as he starts his sprint, the pot's sizzle, and its burst.
    "scream": (CASUAL + "*Ahhh.wav", 0, 1.1, -20),
    "sizzle": (FIRE + "*Sizzle Quick.wav", 0, 0.8, -24),
    "burst": (ECHOES + "Explosions/explosion_distant_1.ogg", 0, 1.1, -17),
}

# Sounds built from a short sample played several times: (source, [(seconds, rate, gain)], length, loudness).
# The library has no hoofbeats, so riders' gallop is Kenney's grass footsteps pitched down into a three-beat canter.
STRIDE = 0.42
SEQUENCES = {
    "hooves": (
        KENNEY_IMPACT + "footstep_grass_002.ogg",
        [(k * STRIDE + beat, rate, gain) for k in range(4) for beat, rate, gain in ((0, 0.55, 0.9), (0.09, 0.6, 0.7), (0.18, 0.5, 1.0))],
        1.75,
        -19,
    ),
}

# name: (source, start, length, loudness, seamless crossfade seconds or 0 when the source already loops)
LOOPS = {
    # A soft country bed (birds, a breeze) under the battle.
    "ambField": (AMBIENCES + "*Countryside Day Loop A.wav", 0, 30, -31, 2),
}

# Music: (source, reverb tail seconds, loudness). Ovani's cuts loop when the tail is laid over the start.
MUSIC = {
    "musicBreak": (CLASSICAL + "*The Fair Cut 60.wav", 2.4, -20),
    "musicWave": (CLASSICAL + "*March! Cut 60.wav", 2.667, -19),
    "musicBoss": (ORCH + "*Retribution Cut 60.wav", 3.273, -19),
}

# The candidates for the owner's ear (GDD §17): slot -> [(label, source, tail)]; the first is the one in the game.
MUSIC_CANDIDATES = {
    "Map and breaks (light folk-orchestral)": [
        ("The Fair", CLASSICAL + "*The Fair Main.wav", 2.4),
        ("Butterflies", CLASSICAL + "*Butterflies Main.wav", 0),
        ("Harmony", ORCH + "*Harmony Main.wav", 4.06),
    ],
    "Waves (drums and brass)": [
        ("March!", CLASSICAL + "*March! Main.wav", 2.667),
        ("March! (more intense)", CLASSICAL + "*March! Intensity 2.wav", 2.667),
        ("Windsor (intense)", CLASSICAL + "*Windsor Intensity 2.wav", 0),
    ],
    "Boss (Sir Grudge)": [
        ("Retribution", ORCH + "*Retribution Intensity 2.wav", 3.273),
        ("Scheming (intense)", CLASSICAL + "*Scheming Intensity 2.wav", 3.692),
    ],
}

MUSIC_BITRATE = "80k"
LOOP_BITRATE = "48k"


def resolve(src):
    if "::" not in src:
        path = os.path.join(LIBRARY, src)
        if not os.path.exists(path):
            raise RuntimeError(f"missing {src}")
        return path
    archive, pattern = src.split("::", 1)
    archive_path = os.path.join(LIBRARY, archive)
    listing = subprocess.run([TAR, "-tf", archive_path], capture_output=True, text=True, errors="replace").stdout
    members = [m for m in listing.splitlines() if fnmatch.fnmatch(m, pattern) and "__MACOSX" not in m and "/._" not in m]
    if not members:
        raise RuntimeError(f"no {pattern} in {archive}")
    member = sorted(members, key=len)[0]
    target = os.path.join(CACHE, os.path.basename(archive))
    out = os.path.join(target, member)
    if not os.path.exists(out):
        os.makedirs(target, exist_ok=True)
        subprocess.run([TAR, "-xf", archive_path, "-C", target, member], check=True)
    return out


def ffmpeg(args):
    result = subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", *args], capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip())


def duration(path):
    probe = FFMPEG.replace("ffmpeg.exe", "ffprobe.exe").replace("/ffmpeg", "/ffprobe")
    if os.path.exists(probe):
        out = subprocess.run([probe, "-v", "error", "-show_entries", "format=duration", "-of", "json", path], capture_output=True, text=True).stdout
        return float(json.loads(out)["format"]["duration"])
    # Without ffprobe: decode and read the last timestamp ffmpeg reports.
    result = subprocess.run([FFMPEG, "-hide_banner", "-i", path, "-f", "null", "-"], capture_output=True, text=True)
    stamp = [p for p in result.stderr.split() if p.startswith("time=")][-1][5:]
    h, m, s = stamp.split(":")
    return int(h) * 3600 + int(m) * 60 + float(s)


def effect(name, src, start, length, lufs):
    path = resolve(src)
    fade = max(0.02, min(0.08, length * 0.2))
    filters = (
        "silenceremove=start_periods=1:start_threshold=-38dB,"
        f"atrim={start}:{start + length},asetpts=PTS-STARTPTS,afade=t=out:st={length - fade}:d={fade},"
        f"loudnorm=I={lufs}:TP=-2,alimiter=limit=0.8:level=false"
    )
    ffmpeg(["-i", path, "-af", filters, "-ac", "1", "-ar", "44100", "-b:a", "80k", os.path.join(OUT, f"{name}.mp3")])


def sequence(name, src, hits, length, lufs):
    """One sample played at each (time, rate, gain), mixed, cut to `length` and levelled."""
    path = resolve(src)
    n = len(hits)
    chains = [f"[0:a]asplit={n}" + "".join(f"[s{k}]" for k in range(n)) + ";"]
    for k, (t, rate, gain) in enumerate(hits):
        chains.append(
            f"[s{k}]asetrate={int(44100 * rate)},aresample=44100,volume={gain},adelay={int(t * 1000)}:all=1[h{k}];"
        )
    mix = "".join(f"[h{k}]" for k in range(n))
    graph = "".join(chains) + (
        f"{mix}amix=inputs={n}:normalize=0:duration=longest,atrim=0:{length},"
        f"afade=t=out:st={length - 0.25}:d=0.25,loudnorm=I={lufs}:TP=-2[out]"
    )
    ffmpeg(["-i", path, "-filter_complex", graph, "-map", "[out]", "-ac", "1", "-ar", "44100", "-b:a", "80k", os.path.join(OUT, f"{name}.mp3")])


def loop(name, src, start, length, lufs, cross):
    path = resolve(src)
    out = os.path.join(OUT, f"{name}.mp3")
    # Seamless: the body, then the tail fading out over the head fading in, so the end flows into the start.
    body_end = start + length - cross
    graph = (
        f"[0:a]asplit=3[a][b][c];"
        f"[a]atrim={start + cross}:{body_end},asetpts=PTS-STARTPTS[body];"
        f"[b]atrim={body_end}:{body_end + cross},asetpts=PTS-STARTPTS,afade=t=out:d={cross}[tail];"
        f"[c]atrim={start}:{start + cross},asetpts=PTS-STARTPTS,afade=t=in:d={cross}[head];"
        f"[tail][head]amix=inputs=2:duration=first:normalize=0[mix];"
        f"[body][mix]concat=n=2:v=0:a=1,loudnorm=I={lufs}:TP=-2[out]"
    )
    ffmpeg(["-i", path, "-filter_complex", graph, "-map", "[out]", "-ac", "1", "-ar", "44100", "-b:a", LOOP_BITRATE, out])


def music(out, src, tail, lufs, bitrate=MUSIC_BITRATE, seconds=0):
    """A loop from a track with a reverb tail: everything but the tail, with the tail laid over the start."""
    path = resolve(src)
    total = duration(path)
    end = min(total, seconds + tail) if seconds else total
    body = end - tail
    if tail > 0:
        graph = (
            f"[0:a]asplit=2[a][b];"
            f"[a]atrim=0:{body},asetpts=PTS-STARTPTS[body];"
            f"[b]atrim={body}:{end},asetpts=PTS-STARTPTS[tail];"
            f"[body][tail]amix=inputs=2:duration=first:normalize=0,loudnorm=I={lufs}:TP=-2[out]"
        )
    else:
        graph = f"[0:a]atrim=0:{end},asetpts=PTS-STARTPTS,afade=t=out:st={max(0, end - 1.5)}:d=1.5,loudnorm=I={lufs}:TP=-2[out]"
    ffmpeg(["-i", path, "-filter_complex", graph, "-map", "[out]", "-ac", "2", "-ar", "44100", "-b:a", bitrate, out])


def candidates():
    """The music candidates, 45 s each, and a page to play them side by side."""
    os.makedirs(CANDIDATES, exist_ok=True)
    rows = []
    for slot, options in MUSIC_CANDIDATES.items():
        cells = []
        for i, (label, src, tail) in enumerate(options):
            file = f"{slot.split(' ')[0].lower()}-{i + 1}.mp3"
            music(os.path.join(CANDIDATES, file), src, tail, -19, "96k", 45)
            pick = " (in the game now)" if i == 0 else ""
            cells.append(f'<li><b>{label}</b>{pick}<br><audio controls preload="none" src="{file}"></audio></li>')
            print(f"candidate {file}: {label}")
        rows.append(f"<h2>{slot}</h2><ol>{''.join(cells)}</ol>")
    page = (
        "<!doctype html><meta charset=utf-8><title>Thunder Knight music candidates</title>"
        "<style>body{font:16px system-ui;margin:24px;max-width:720px}li{margin:12px 0}audio{width:100%}</style>"
        "<h1>Music candidates</h1><p>The first in each list plays in the game now. Tell Claude which you prefer.</p>"
        + "".join(rows)
    )
    with open(os.path.join(CANDIDATES, "index.html"), "w", encoding="utf-8") as f:
        f.write(page)
    print(f"page: {os.path.join(CANDIDATES, 'index.html')}")


def main():
    os.makedirs(OUT, exist_ok=True)
    args = sys.argv[1:]
    if "--candidates" in args:
        candidates()
        return
    only = set(args)
    failed = 0
    jobs = [(n, lambda v=v, n=n: effect(n, *v)) for n, v in EFFECTS.items()]
    jobs += [(n, lambda v=v, n=n: sequence(n, *v)) for n, v in SEQUENCES.items()]
    jobs += [(n, lambda v=v, n=n: loop(n, *v)) for n, v in LOOPS.items()]
    jobs += [(n, lambda v=v, n=n: music(os.path.join(OUT, f"{n}.mp3"), *v)) for n, v in MUSIC.items()]
    for name, job in jobs:
        if only and name not in only:
            continue
        try:
            job()
            print(f"{name}.mp3")
        except Exception as error:  # noqa: BLE001 - one bad clip shouldn't stop the rest
            failed += 1
            print(f"FAILED {name}: {error}")
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f"{len(os.listdir(OUT))} files, {total // 1024} KB")
    sys.exit(1 if failed else 0)


main()
