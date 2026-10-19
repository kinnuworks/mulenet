#!/usr/bin/env python3
"""Lays the recorded voice lines over the synthesized score and remuxes the final MP4.

    python3 scripts/mix_voice.py --film mulenet --video out/mulenet-16x9.mp4 [--out out/mulenet-final.mp4]

Each line in film.meta.voice is placed at its scene's start frame + its beat offset (from
build/<film>.timeline.json, so picture and voice share the beat grid). Lines are levelled to the
same loudness, the score ducks under the voice with a sidechain compressor, and the master lands
at -14 LUFS / -1 dBTP for YouTube and phones.
"""
import argparse, json, os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--film', required=True)
    ap.add_argument('--video', required=True, help='rendered MP4 (its own audio is replaced)')
    ap.add_argument('--out')
    ap.add_argument('--voice-gain', type=float, default=1.5, help='dB on the voice bus')
    ap.add_argument('--bed-gain', type=float, default=-3.0, help='dB on the score before ducking')
    a = ap.parse_args()

    tl = json.load(open(os.path.join(ROOT, 'build', f'{a.film}.timeline.json')))
    fps = tl['meta']['fps']
    fpb = fps * 60 / tl['meta']['bpm']
    starts = {s['id']: s['start'] for s in tl['scenes']}
    voice = tl['meta']['voice']
    bed = os.path.join(ROOT, 'build', f'{a.film}.wav')
    if not os.path.exists(bed):
        raise SystemExit(f'missing {bed}: run the render (or scripts/score.py) first')

    inputs = ['-i', bed]
    chains = []
    labels = []
    for i, v in enumerate(voice):
        t = (starts[v['scene']] + v['beat'] * fpb) / fps
        inputs += ['-i', os.path.join(ROOT, 'public', v['file'])]
        ms = int(round(t * 1000))
        # level each line, then place it on the timeline
        chains.append(f"[{i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=-17:TP=-2:LRA=7,aresample=48000,adelay={ms}|{ms}[v{i}]")
        labels.append(f'[v{i}]')
        print(f"  {v['file']:<16} @ {t:6.2f}s  ({v['scene']} +{v['beat']} beats)")
    chains.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0,volume={a.voice_gain}dB,apad,asplit=2[vox][key]")
    chains.append(f"[0:a]aresample=48000,volume={a.bed_gain}dB[bed]")
    chains.append("[bed][key]sidechaincompress=threshold=0.03:ratio=6:attack=25:release=380:makeup=1[duck]")
    chains.append("[duck][vox]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1:LRA=9,aresample=48000,afade=t=in:d=0.004[mix]")

    mix_wav = os.path.join(ROOT, 'build', f'{a.film}-mix.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(chains), '-map', '[mix]', '-ar', '48000', mix_wav], check=True)

    out = a.out or a.video.replace('.mp4', '-voiced.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.video, '-i', mix_wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
                    '-ar', '48000', '-shortest', '-movflags', '+faststart', out], check=True)
    # report the final loudness
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', out, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
    summary = r.stderr[r.stderr.rfind('Summary:'):]
    print(' '.join(summary.split())[:220])
    print('→', os.path.relpath(out, ROOT))


if __name__ == '__main__':
    main()
