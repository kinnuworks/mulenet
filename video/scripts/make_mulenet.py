#!/usr/bin/env python3
"""Generates src/films/mulenet.json — the MuleNet demo film.

Every scene is sized to its recorded voice line(s) (public/voice/vNN.mp3, measured with ffprobe)
plus a breath, on a 120 BPM grid (1 beat = 0.5 s = 15 frames at 30 fps). Voice placements are
written to meta.voice for scripts/mix_voice.py; captions and events are timed to the words.
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MARK_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">'
    '<rect width="64" height="64" rx="14" fill="#16181D"/>'
    '<path d="M20 22L32 44M44 22L32 44M20 22H44" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".55"/>'
    '<circle cx="20" cy="22" r="5" fill="#fff"/><circle cx="44" cy="22" r="5" fill="#fff"/><circle cx="32" cy="44" r="5" fill="#fff"/>'
    '<circle cx="32" cy="44" r="10" fill="none" stroke="#F7A028" stroke-width="2.5"/></svg>'
)

brand = {
    "bg": "#07080A", "surface": "#FFFFFF", "ink": "#F3F1EC", "muted": "#9CA0AA", "line": "rgba(255,255,255,0.1)",
    "accent": "#F7A028", "accentInk": "#2A1700", "dark": "#07080A", "darkInk": "#F3F1EC",
    "fontDisplay": "Inter", "fontText": "Inter", "fontMono": "Geist Mono", "fontSerif": "Instrument Serif",
    "emphasis": "accent", "tracking": -0.042, "weight": 760, "look": "neon",
    "panel": "#0E1014", "panelBorder": "rgba(255,255,255,0.08)",
}

voice = []  # {file, scene, beat}
def v(n, scene, beat):
    voice.append({"file": f"voice/v{n:02d}.mp3", "scene": scene, "beat": beat})

def cap(at, until, text, pos=(0.5, 0.105), size=None, **kw):
    c = {"at": at, "until": until, "text": text, "pos": list(pos)}
    if size:
        c["size"] = size
    c.update(kw)
    return c

scenes = []

# ── 1 · HOOK ──────────────────────────────────────────────────────────── 28 beats
v(1, "hook", 0.4); v(2, "hook", 8.5); v(3, "hook", 19.5)
NET_X, NET_Y = 940, 40  # network panel centre; its money source sits at the phone's right edge
scenes.append({
    "id": "hook", "type": "Journey", "beats": 28, "music": "sparse",
    "props": {
        "panels": [
            {"id": "pay", "screen": "MnPay", "chrome": "phone", "x": 0, "y": 70, "w": 368, "h": 760, "from": 2.7, "enter": "fade",
             "props": {"mode": "pay", "tapAt": 6.8, "resultAt": 7.3, "amountAt": 4.0}, "float": 3},
            {"id": "net", "screen": "MnNetwork", "chrome": "none", "x": NET_X, "y": NET_Y, "w": 2600, "h": 1500,
             "dof": False, "float": 0, "from": 7.8, "enter": "fade",
             "props": {"phase": "split", "hop1At": 8.8, "hop2At": 11.2, "hopBeats": 1.8,
                       "spot": [19.8, 20.55, 21.3, 22.05, 22.8], "ringAt": 23.9}},
        ],
        "overlays": [
            {"id": "hookText", "screen": "MnHook", "chrome": "none", "x": 0, "y": 0, "w": 1920, "h": 1080, "to": 4.6, "exit": "none",
             "props": {"flyAt": 3.0, "landAt": 4.2, "toY": 500, "toScale": 0.2}},
        ],
        "shots": [
            {"at": 0, "x": 0, "y": 20, "zoom": 1.0},
            {"at": 4.4, "x": 0, "y": 40, "zoom": 1.06, "ms": 900, "ease": "camera"},
            {"at": 6.4, "x": 0, "y": 80, "zoom": 1.12, "ms": 500, "ease": "premium"},
            {"at": 8.0, "x": 840, "y": -50, "zoom": 0.6, "ms": 1700, "ease": "camera"},
            {"at": 19.4, "x": 1000, "y": -40, "zoom": 0.64, "ms": 1400, "ease": "sine"},
            {"at": 23.6, "x": 900, "y": -50, "zoom": 0.58, "ms": 1600, "ease": "camera"},
        ],
        "captions": [
            cap(4.4, 7.9, "Sent in *one tap.*", pos=(0.07, 0.47), align="left", size=96),
            cap(8.7, 13.1, "Within minutes, *12 mule accounts.*"),
            cap(14.0, 18.4, "Spread across *5 banks.*"),
            cap(19.2, 23.2, "Each bank sees *one piece.*"),
            cap(24.0, 27.6, "Nobody sees *the ring.*"),
        ],
        "pulses": [0, 7.3, 23.9],
    },
    "addCues": [
        {"at": 0.0, "sfx": "drop", "gain": -3},
        {"at": 3.0, "sfx": "whoosh", "leadBeats": 0.6, "gain": -5},
        {"at": 4.2, "sfx": "thock", "gain": -2},
        {"at": 6.8, "sfx": "click", "gain": 0},
        {"at": 7.3, "sfx": "chime", "gain": -2},
        {"at": 8.0, "sfx": "whoosh", "leadBeats": 0.8, "gain": -3},
        {"at": 10.6, "sfx": "pop", "gain": -6}, {"at": 10.95, "sfx": "pop", "gain": -6, "pitch": 2}, {"at": 11.3, "sfx": "pop", "gain": -6, "pitch": 4},
        {"at": 13.0, "sfx": "tick", "gain": -8}, {"at": 13.35, "sfx": "tick", "gain": -8, "pitch": 2}, {"at": 13.7, "sfx": "tick", "gain": -8, "pitch": 4},
        {"at": 14.05, "sfx": "tick", "gain": -8, "pitch": 5},
        {"at": 19.8, "sfx": "tick", "gain": -6}, {"at": 20.55, "sfx": "tick", "gain": -6, "pitch": 2}, {"at": 21.3, "sfx": "tick", "gain": -6, "pitch": 4},
        {"at": 22.05, "sfx": "tick", "gain": -6, "pitch": 5}, {"at": 22.8, "sfx": "tick", "gain": -6, "pitch": 7},
        {"at": 22.4, "sfx": "riser", "beats": 1.5, "gain": -8},
        {"at": 23.9, "sfx": "hit", "gain": -3},
    ],
})

# ── 2 · BLOCKED ──────────────────────────────────────────────────────── 14 beats
v(4, "blocked", 0.5)
scenes.append({
    "id": "blocked", "type": "Journey", "beats": 14, "in": "cut", "music": "build",
    "props": {
        "panels": [
            {"id": "pay", "screen": "MnPay", "chrome": "phone", "x": 0, "y": 70, "w": 368, "h": 760,
             "props": {"mode": "pay", "tapAt": -20, "resultAt": -19}, "float": 3, "to": 2, "exit": "fade"},
            {"id": "net", "screen": "MnNetwork", "chrome": "none", "x": NET_X, "y": NET_Y, "w": 2600, "h": 1500,
             "dof": False, "float": 0, "props": {"phase": "blocked", "linkAt": 0.4, "breakAt": 4.6, "accuseAt": 6.6}},
        ],
        "shots": [
            {"at": 0, "x": 900, "y": -50, "zoom": 0.58},
            {"at": 0.1, "x": 1340, "y": 30, "zoom": 0.72, "ms": 6800, "ease": "sine"},
        ],
        "captions": [
            cap(0.5, 5.4, "Banks *can't* share customer data."),
            cap(6.2, 13.4, "Nor accuse a *rival's* customer."),
        ],
        "pulses": [4.6],
    },
    "addCues": [
        {"at": 4.6, "sfx": "thock", "gain": -2},
        {"at": 4.9, "sfx": "thock", "gain": -5, "pitch": -2},
    ],
})

# ── 3 · REVEAL ───────────────────────────────────────────────────────── 19 beats
v(5, "reveal", 1.0); v(6, "reveal", 5.0)
MARK_W = (1340, 30)  # world position of the mark the network collapses into
scenes.append({
    "id": "reveal", "type": "Journey", "beats": 19, "in": "cut", "music": "full",
    "props": {
        "panels": [
            {"id": "net", "screen": "MnNetwork", "chrome": "none", "x": NET_X, "y": NET_Y, "w": 2600, "h": 1500,
             "dof": False, "float": 0, "props": {"phase": "reveal", "collapseAt": 0.4}},
            {"id": "name", "screen": "KitText", "chrome": "none", "x": MARK_W[0] + 820, "y": MARK_W[1] - 10, "w": 1100, "h": 300,
             "dof": False, "float": 0, "props": {"text": "MuleNet", "at": 2.4, "size": 250, "align": "left"}},
        ],
        "shots": [
            {"at": 0, "x": 1340, "y": 30, "zoom": 0.72},
            {"at": 0.2, "x": MARK_W[0], "y": MARK_W[1], "zoom": 0.86, "ms": 1600, "ease": "camera"},
            {"at": 3.6, "x": MARK_W[0] + 600, "y": MARK_W[1] + 40, "zoom": 0.74, "ms": 1300, "ease": "camera"},
            {"at": 6.4, "x": MARK_W[0] + 600, "y": MARK_W[1] + 40, "zoom": 0.78, "ms": 6000, "ease": "sine"},
        ],
        "captions": [
            cap(4.8, 8.9, "Banks flag mule accounts *together.*", pos=(0.5, 0.82)),
            cap(9.7, 12.0, "On *Midnight.*", pos=(0.5, 0.82)),
            cap(12.8, 18.4, "Without sharing *a single customer record.*", pos=(0.5, 0.82)),
        ],
        "pulses": [2.4],
        "blooms": [{"at": 2.4, "color": "#F7A028"}],
    },
    "addCues": [
        {"at": 0.4, "sfx": "riser", "beats": 2, "gain": -6},
        {"at": 2.4, "sfx": "hit", "gain": 0},
        {"at": 2.6, "sfx": "shimmer", "gain": -6},
    ],
})

# ── 4 · REPORT ───────────────────────────────────────────────────────── 29 beats
v(7, "report", 0.5); v(8, "report", 11.0)
scenes.append({
    "id": "report", "type": "Journey", "beats": 29, "in": {"type": "push", "dir": "left"}, "music": "full",
    "props": {
        "panels": [
            {"id": "desk", "screen": "MnDesk", "chrome": "card", "x": 0, "y": 70, "w": 1100, "h": 640, "radius": 28, "float": 4,
             "props": {"typeAt": 1.0, "clickAt": 6.2, "doneAt": 9.6, "bank": "HDFC"}},
            {"id": "proof", "screen": "MnProof", "chrome": "card", "x": 1950, "y": 60, "w": 1600, "h": 820, "radius": 28, "float": 4,
             "props": {"treeAt": 10.6, "pathAt": 11.6, "rootAt": 14.4, "s1": 14.8, "s2": 19.6, "s3": 22.9, "tagAt": 24.2}},
        ],
        "shots": [
            {"at": 0, "x": 0, "y": 10, "zoom": 1.32},
            {"at": 0.1, "x": 0, "y": 20, "zoom": 1.36, "ms": 2200, "ease": "sine"},
            {"at": 5.0, "x": -200, "y": 150, "zoom": 1.48, "ms": 900, "ease": "camera"},
            {"at": 7.4, "x": 0, "y": 70, "zoom": 1.3, "ms": 900, "ease": "camera"},
            {"at": 9.8, "x": 1950, "y": 50, "zoom": 1.0, "ms": 1100, "ease": "camera"},
            {"at": 12.2, "x": 1950, "y": 50, "zoom": 1.04, "ms": 7200, "ease": "sine"},
        ],
        "captions": [
            cap(0.5, 4.4, "*01* · A bank spots a mule."),
        ],
        "pulses": [14.4],
    },
    "addCues": [
        {"at": 1.0, "sfx": "type", "beats": 2.2, "gain": -10},
        {"at": 3.6, "sfx": "type", "beats": 1.6, "gain": -12},
        {"at": 6.2, "sfx": "click", "gain": 0},
        {"at": 9.6, "sfx": "chime", "gain": -4},
        {"at": 10.0, "sfx": "whoosh", "leadBeats": 0.9, "gain": -3},
        {"at": 14.4, "sfx": "pop", "gain": -2},
        {"at": 14.8, "sfx": "tick", "gain": -4}, {"at": 19.6, "sfx": "thock", "gain": -4}, {"at": 22.9, "sfx": "thock", "gain": -4, "pitch": 2},
        {"at": 24.2, "sfx": "count", "beats": 1.4, "gain": -10},
    ],
})

# ── 5 · AGREE ────────────────────────────────────────────────────────── 27 beats
v(9, "agree", 0.5); v(10, "agree", 13.5)
scenes.append({
    "id": "agree", "type": "Journey", "beats": 27, "in": {"type": "push", "dir": "left"}, "music": "full",
    "props": {
        "panels": [
            {"id": "thr", "screen": "MnThreshold", "chrome": "none", "x": 0, "y": 80, "w": 1600, "h": 820, "float": 0, "dof": False,
             "props": {"r1": 4.0, "r2": 7.0, "r3": 10.0, "dup": 13.6, "dupRej": 16.6, "rogue": 19.8, "rogueRej": 22.6}},
        ],
        "shots": [
            {"at": 0, "x": 60, "y": 40, "zoom": 1.3},
            {"at": 0.1, "x": 60, "y": 40, "zoom": 1.36, "ms": 6000, "ease": "sine"},
            {"at": 13.0, "x": 40, "y": 110, "zoom": 1.15, "ms": 1000, "ease": "camera"},
            {"at": 15.2, "x": 40, "y": 110, "zoom": 1.19, "ms": 5800, "ease": "sine"},
        ],
        "captions": [
            cap(0.5, 12.4, "*02* · Three independent banks must agree."),
            cap(13.6, 16.4, "Report twice?"),
            cap(19.8, 23.2, "Not a licensed bank?"),
        ],
        "pulses": [11.0, 16.6, 22.6],
        "blooms": [{"at": 11.0, "color": "#FF5A47"}],
    },
    "addCues": [
        {"at": 5.0, "sfx": "thock", "gain": -3}, {"at": 8.0, "sfx": "thock", "gain": -3, "pitch": 2}, {"at": 11.0, "sfx": "thock", "gain": -2, "pitch": 4},
        {"at": 11.0, "sfx": "hit", "gain": -2},
        {"at": 13.6, "sfx": "swish", "gain": -6}, {"at": 16.6, "sfx": "hit", "gain": -3},
        {"at": 19.8, "sfx": "swish", "gain": -6}, {"at": 22.6, "sfx": "hit", "gain": -3},
    ],
})

# ── 6 · CHECK ────────────────────────────────────────────────────────── 25 beats
v(11, "check", 0.5); v(12, "check", 9.0)
scenes.append({
    "id": "check", "type": "Journey", "beats": 25, "in": {"type": "zoom"}, "music": "full",
    "props": {
        "panels": [
            {"id": "pay2", "screen": "MnPay", "chrome": "phone", "x": 0, "y": 70, "w": 368, "h": 760, "float": 3,
             "props": {"mode": "check", "tapAt": 6.2, "resultAt": 9.2}},
            {"id": "chain", "screen": "MnChain", "chrome": "none", "x": 1750, "y": 60, "w": 1600, "float": 0, "dof": False,
             "from": 13.0, "enter": "fade", "h": 560, "props": {"inAt": 13.0, "ghostAt": 15.4, "zeroAt": 18.9}},
        ],
        "shots": [
            {"at": 0, "x": 0, "y": 30, "zoom": 1.0},
            {"at": 0.1, "x": 0, "y": 60, "zoom": 1.08, "ms": 4400, "ease": "sine"},
            {"at": 8.95, "x": -60, "y": 160, "zoom": 1.14, "ms": 900, "ease": "camera"},
            {"at": 13.2, "x": 1750, "y": 60, "zoom": 1.08, "ms": 1300, "ease": "camera"},
            {"at": 16.0, "x": 1750, "y": 60, "zoom": 1.13, "ms": 4400, "ease": "sine"},
        ],
        "captions": [
            cap(0.5, 8.4, "*03* · Check the payee before paying."),
            cap(9.3, 12.9, "Payment *blocked.*", pos=(0.06, 0.48), align="left", size=96),
            cap(18.9, 24.4, "No transaction. *No trace.*"),
        ],
        "pulses": [9.2],
    },
    "addCues": [
        {"at": 6.2, "sfx": "click", "gain": 0},
        {"at": 9.2, "sfx": "hit", "gain": -2},
        {"at": 13.2, "sfx": "whoosh", "leadBeats": 0.9, "gain": -4},
        {"at": 18.9, "sfx": "pop", "gain": -3},
    ],
})

# ── 7 · APPEAL ───────────────────────────────────────────────────────── 13 beats
v(13, "appeal", 0.5)
scenes.append({
    "id": "appeal", "type": "Journey", "beats": 13, "in": {"type": "push", "dir": "left"}, "music": "build",
    "props": {
        "panels": [
            {"id": "reg", "screen": "MnRegistry", "chrome": "card", "x": 0, "y": 80, "w": 1240, "h": 560, "radius": 28, "float": 4,
             "props": {"clickAt": 5.4, "flipAt": 6.2}},
        ],
        "shots": [
            {"at": 0, "x": 0, "y": 70, "zoom": 1.24},
            {"at": 0.1, "x": 0, "y": 90, "zoom": 1.32, "ms": 5800, "ease": "sine"},
        ],
        "captions": [
            cap(0.5, 5.2, "*04* · Wrongly flagged? Appeal."),
            cap(7.4, 12.6, "A *clean round* begins."),
        ],
    },
    "addCues": [
        {"at": 5.4, "sfx": "click", "gain": 0},
        {"at": 6.2, "sfx": "chime", "gain": -4},
    ],
})

# ── 8 · LEDGER (the dark breath) ─────────────────────────────────────── 17 beats
v(14, "ledger", 0.5)
scenes.append({
    "id": "ledger", "type": "Journey", "beats": 17, "in": {"type": "blur"}, "music": "break", "tone": "dark",
    "props": {
        "panels": [
            {"id": "led", "screen": "MnLedger", "chrome": "none", "x": 0, "y": 80, "w": 1600, "h": 860, "float": 0, "dof": False,
             "props": {"typeAt": 0.4, "tagsAt": 4.0, "countsAt": 6.5, "nullAt": 8.3, "sealAt": 10.0}},
        ],
        "shots": [
            {"at": 0, "x": 0, "y": 60, "zoom": 0.98},
            {"at": 3.4, "x": -330, "y": 60, "zoom": 1.12, "ms": 1000, "ease": "camera"},
            {"at": 9.4, "x": 430, "y": 40, "zoom": 1.08, "ms": 1100, "ease": "camera"},
        ],
        "captions": [
            cap(0.5, 5.2, "*05* · What the chain sees."),
            cap(10.4, 16.6, "Nothing a bank could *leak.*", pos=(0.5, 0.9)),
        ],
    },
    "addCues": [
        {"at": 4.0, "sfx": "tick", "gain": -4}, {"at": 6.5, "sfx": "tick", "gain": -4, "pitch": 2}, {"at": 8.3, "sfx": "tick", "gain": -4, "pitch": 4},
        {"at": 10.3, "sfx": "thock", "gain": -6}, {"at": 10.75, "sfx": "thock", "gain": -6, "pitch": 2}, {"at": 11.2, "sfx": "thock", "gain": -6, "pitch": 4},
        {"at": 11.65, "sfx": "thock", "gain": -6, "pitch": 5}, {"at": 12.1, "sfx": "thock", "gain": -6, "pitch": 7},
    ],
})

# ── 9 · PROOF ────────────────────────────────────────────────────────── 33 beats
v(15, "proof", 0.5); v(16, "proof", 16.0)
scenes.append({
    "id": "proof", "type": "Journey", "beats": 33, "in": {"type": "push", "dir": "left"}, "music": "full",
    "props": {
        "panels": [
            {"id": "rec", "screen": "MnReceipt", "chrome": "none", "x": 0, "y": 80, "w": 1500, "h": 900, "float": 0, "dof": False,
             "props": {"streamAt": 1.0, "streamBeats": 6.5, "countAt": 8.0, "rejAt": 12.0}},
            {"id": "tests", "screen": "MnTests", "chrome": "none", "x": 2100, "y": 80, "w": 1600, "h": 860, "float": 0, "dof": False,
             "props": {"waveAt": 16.3, "waveBeats": 3.2, "mutAt": 21.0, "caughtAt": 26.6}},
        ],
        "shots": [
            {"at": 0, "x": 0, "y": 60, "zoom": 0.96},
            {"at": 0.1, "x": 0, "y": 60, "zoom": 1.0, "ms": 7000, "ease": "sine"},
            {"at": 15.0, "x": 2100, "y": -60, "zoom": 1.08, "ms": 1200, "ease": "camera"},
            {"at": 17.6, "x": 2100, "y": -60, "zoom": 1.12, "ms": 6800, "ease": "sine"},
        ],
        "captions": [
            cap(0.5, 7.4, "*06* · Every action, a real ZK proof."),
        ],
        "pulses": [9.2, 30.0],
    },
    "addCues": [
        {"at": 1.0, "sfx": "tick", "gain": -10}, {"at": 2.6, "sfx": "tick", "gain": -10, "pitch": 2}, {"at": 4.2, "sfx": "tick", "gain": -10, "pitch": 4},
        {"at": 8.0, "sfx": "count", "beats": 1.2, "gain": -8},
        {"at": 12.0, "sfx": "hit", "gain": -5}, {"at": 12.5, "sfx": "hit", "gain": -5}, {"at": 13.0, "sfx": "hit", "gain": -5},
        {"at": 15.0, "sfx": "whoosh", "leadBeats": 0.9, "gain": -4},
        {"at": 16.3, "sfx": "riser", "beats": 3, "gain": -10},
        {"at": 19.5, "sfx": "chime", "gain": -6},
        {"at": 26.6, "sfx": "count", "beats": 2.4, "gain": -10},
        {"at": 29.2, "sfx": "chime", "gain": -3},
    ],
})

# ── 10 · OUTRO ───────────────────────────────────────────────────────── 16 beats
v(17, "outro", 1.0)
scenes.append({
    "id": "outro", "type": "Outro", "beats": 16, "in": {"type": "blur"}, "music": "out",
    "events": {"mark": 0.3, "line": 3, "roll": 4.6, "url": 9, "click": 11.5},
    "props": {"name": "MuleNet", "markSvg": MARK_SVG, "line": "Stop paying mule accounts", "roll": ["alone.", "blind.", "*together.*"],
              "url": "github.com/kinnuworks/mulenet", "cta": "Built on Midnight", "look": "neon", "scale": 1.5},
})

# camera moves can't overlap: a shot that starts before the previous one ends gets delayed
for sc in scenes:
    end = -1e9
    for sh in sorted(sc.get("props", {}).get("shots", []), key=lambda x: x["at"]):
        start = max(sh["at"], end)
        if start > sh["at"] + 0.05:
            print(f"  ! {sc['id']}: shot at {sh['at']} delayed to {start:.2f} (previous move still running)")
        end = start + sh.get("ms", 0) / 500.0

film = {
    "meta": {"title": "MuleNet — Midnight Buildathon demo", "fps": 30, "bpm": 120, "beatsPerBar": 4, "tailBeats": 2,
             "key": "A", "chords": ["Am7", "Fmaj7", "Cmaj7", "G"], "target": 112, "voice": voice},
    "brand": brand,
    "grain": 0.035,
    "scenes": scenes,
}
out = os.path.join(ROOT, "src", "films", "mulenet.json")
with open(out, "w") as fh:
    json.dump(film, fh, indent=1, ensure_ascii=False)
print("wrote", out, "·", sum(s["beats"] for s in scenes), "beats")
