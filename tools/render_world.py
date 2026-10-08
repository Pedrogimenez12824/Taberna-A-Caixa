#!/usr/bin/env python3
"""Free local stand-in for the scroll-world video chain.

Builds one big "world" (a dark table with the taberna's photos as polaroids,
the logo and the printed menu) and flies a virtual camera over it. Each scene
gets a dive clip (zoom into the photo) and each pair of scenes a connector
(pull up, fly over, come down). Because every clip is rendered from the same
world with the same camera math, the connector's first frame IS the previous
dive's last frame and its last frame IS the next dive's first frame, which is
the skill's frame-identical seam rule (SKILL.md Step 5) without paid models.

usage: python3 render_world.py <img_dir> <logo_src> <menu_src> <font.ttf> <out_dir>

The homepage hero (assets/video/hero.mp4) is dive_0 + conn_0 + dive_1 joined
with ffmpeg, dropping the duplicated first frame of each later clip.
"""
import math, os, subprocess, sys, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

IMG, LOGO_SRC, MENU_SRC, FONT, OUT = sys.argv[1:6]
W, H, FPS = 1280, 720, 30
DIVE_S, CONN_S = 4.0, 3.0
BG = (35, 36, 39)
CREAM = (226, 214, 184)
INK = (42, 42, 44)
os.makedirs(OUT, exist_ok=True)
random.seed(7)

WORLD_W, WORLD_H = 9800, 2700
world = Image.new("RGB", (WORLD_W, WORLD_H), BG)

# table texture: soft light pools + fine noise
glow = Image.new("L", (WORLD_W // 10, WORLD_H // 10), 0)
gd = ImageDraw.Draw(glow)
for _ in range(26):
    x, y, r = random.randint(0, 980), random.randint(0, 270), random.randint(40, 110)
    gd.ellipse((x - r, y - r, x + r, y + r), fill=random.randint(10, 22))
glow = glow.filter(ImageFilter.GaussianBlur(30)).resize((WORLD_W, WORLD_H), Image.BICUBIC)
world.paste(Image.new("RGB", world.size, (70, 66, 58)), (0, 0), glow)
noise = Image.effect_noise((WORLD_W // 2, WORLD_H // 2), 18).resize((WORLD_W, WORLD_H))
world = Image.blend(world, Image.merge("RGB", (noise, noise, noise)), 0.05)

font = ImageFont.truetype(FONT, 46)


def rot_offset(dx, dy, deg):
    a = math.radians(deg)
    return dx * math.cos(a) + dy * math.sin(a), -dx * math.sin(a) + dy * math.cos(a)


def place(card, cx, cy, deg, shadow=True):
    """Rotate a card and paste it centred at (cx, cy) with a soft shadow."""
    r = card.convert("RGBA").rotate(deg, resample=Image.BICUBIC, expand=True)
    x, y = int(cx - r.width / 2), int(cy - r.height / 2)
    if shadow:
        sh = Image.new("RGBA", r.size, (0, 0, 0, 0))
        sh.putalpha(r.getchannel("A").point(lambda v: int(v * 0.55)))
        pad = 60
        big = Image.new("RGBA", (r.width + 2 * pad, r.height + 2 * pad), (0, 0, 0, 0))
        big.paste(sh, (pad, pad))
        big = big.filter(ImageFilter.GaussianBlur(22))
        world.paste(big, (x - pad + 14, y - pad + 26), big)
    world.paste(r, (x, y), r)


def polaroid(name, caption, cx, cy, deg, scale=1.0):
    ph = Image.open(os.path.join(IMG, name)).convert("RGB")
    ph = ph.resize((int(ph.width * scale), int(ph.height * scale)), Image.LANCZOS)
    m, bottom = int(34 * scale), int(130 * scale)
    card = Image.new("RGB", (ph.width + 2 * m, ph.height + m + bottom), CREAM)
    card.paste(ph, (m, m))
    d = ImageDraw.Draw(card)
    f = ImageFont.truetype(FONT, int(46 * scale))
    tw = d.textlength(caption, font=f)
    d.text(((card.width - tw) / 2, ph.height + m + (bottom - 46 * scale) / 2 - 6), caption, font=f, fill=INK)
    place(card, cx, cy, deg)
    dx = m + ph.width / 2 - card.width / 2
    dy = m + ph.height / 2 - card.height / 2
    ox, oy = rot_offset(dx, dy, deg)
    return {"card": (cx, cy, card.width, card.height), "photo": (cx + ox, cy + oy, ph.width, ph.height), "deg": deg}


# ---- the world layout (left to right, gently zig-zagging) ----
# logo: crop the cream circle out of the original logo image
lg = Image.open(LOGO_SRC).convert("RGB")
C, R = (603, 452), 398
logo = lg.crop((C[0] - R, C[1] - R, C[0] + R, C[1] + R))
mask = Image.new("L", (R * 8, R * 8), 0)
ImageDraw.Draw(mask).ellipse((0, 0, R * 8 - 1, R * 8 - 1), fill=255)
logo.putalpha(mask.resize(logo.size, Image.LANCZOS))
LOGO_C = (950, 1250)
place(logo, *LOGO_C, 0)
door_c = (LOGO_C[0] - R + 474, LOGO_C[1] - R + 398)   # the safe's door inside the logo

# decorative extras (not scenes) so the world feels lived-in
polaroid("cojines.jpg", "Los cojines", 3120, 2050, 8, 0.75)
polaroid("bici.jpg", "La bici", 6020, 2080, -7, 0.7)

scenes = [
    polaroid("terraza.jpg", "La terraza", 2420, 950, -4),
    polaroid("comedor.jpg", "El comedor", 3950, 1380, 3),
    polaroid("ventana.jpg", "La ventana", 5330, 880, -3),
    polaroid("rincon.jpg", "El rincón", 6680, 1330, 2.5),
]

menu = Image.open(MENU_SRC).convert("RGB")
ms = 0.85
menu = menu.resize((int(menu.width * ms), int(menu.height * ms)), Image.LANCZOS)
MENU_C = (8450, 1300)
place(menu, *MENU_C, 0)

world.save(os.path.join(OUT, "world_preview.jpg"), quality=70)

# mip levels so far-out frames don't alias
mips = [world]
for _ in range(4):
    mips.append(mips[-1].reduce(2))


# ---- cameras: (cx, cy, width_in_world_px, angle_deg) ----
def fill_w(pw, ph):
    return min(pw, ph * W / H) * 0.97


cams = []
# scene 0: the logo, diving into the safe's door
cams.append(((LOGO_C[0], LOGO_C[1], 2 * R * 2.3, 0), (door_c[0], door_c[1], 290, 0)))
for s in scenes:
    cx, cy, cw, ch = s["card"]
    px, py, pw, ph = s["photo"]
    cams.append(((cx, cy, max(cw, ch * W / H) * 2.3, 0), (px, py, fill_w(pw, ph), s["deg"])))
# finale: the printed menu, from the whole sheet down onto the first dishes
mw, mh = menu.size
cams.append(((MENU_C[0], MENU_C[1], mh * 1.12 * W / H, 0),
             (MENU_C[0], MENU_C[1] - mh / 2 + 470 * ms, 1180, 0)))


def ease(t):
    return t * t * t * (t * (t * 6 - 15) + 10)


def lerp(a, b, t):
    return a + (b - a) * t


def cam_dive(a, b, t):
    e = ease(t)
    return (lerp(a[0], b[0], e), lerp(a[1], b[1], e),
            math.exp(lerp(math.log(a[2]), math.log(b[2]), e)), lerp(a[3], b[3], e))


def cam_conn(a, b, t):
    e = ease(t)
    dist = math.hypot(b[0] - a[0], b[1] - a[1])
    mid = max(dist * 1.35, b[2] * 1.15)
    bump = max(0.0, math.log(mid) - (math.log(a[2]) + math.log(b[2])) / 2)
    lw = lerp(math.log(a[2]), math.log(b[2]), e) + bump * math.sin(math.pi * e)
    return (lerp(a[0], b[0], e), lerp(a[1], b[1], e), math.exp(lw), lerp(a[3], b[3], e))


def render(cam):
    cx, cy, cw, deg = cam
    s = cw / W
    k = max(0, min(len(mips) - 1, int(math.floor(math.log2(max(s, 1e-6))))))
    f = 2 ** k
    src = mips[k]
    s2, cx2, cy2 = s / f, cx / f, cy / f
    a = math.radians(deg)
    co, si = math.cos(a), math.sin(a)
    coeffs = (s2 * co, s2 * si, cx2 - s2 * co * W / 2 - s2 * si * H / 2,
              -s2 * si, s2 * co, cy2 + s2 * si * W / 2 - s2 * co * H / 2)
    return src.transform((W, H), Image.AFFINE, coeffs, resample=Image.BICUBIC, fillcolor=BG)


def encode(path, frames_fn, n):
    # skill Step 6 encode: native res, crf 20, small GOP, no audio, faststart, light unsharp
    p = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", str(FPS), "-i", "-", "-an", "-vf", "unsharp=5:5:0.5:5:5:0.0",
         "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p",
         "-g", "8", "-keyint_min", "8", "-sc_threshold", "0", "-movflags", "+faststart", path],
        stdin=subprocess.PIPE)
    for i in range(n):
        p.stdin.write(frames_fn(i / (n - 1)).tobytes())
    p.stdin.close()
    p.wait()


ND, NC = int(DIVE_S * FPS), int(CONN_S * FPS)
for i, (a, b) in enumerate(cams):
    render(a).save(os.path.join(OUT, f"still_{i}.webp"), quality=82)
    encode(os.path.join(OUT, f"dive_{i}.mp4"), lambda t: render(cam_dive(a, b, t)), ND)
    print("dive", i, flush=True)
    if i < len(cams) - 1:
        nxt = cams[i + 1][0]
        encode(os.path.join(OUT, f"conn_{i}.mp4"), lambda t: render(cam_conn(b, nxt, t)), NC)
        print("conn", i, flush=True)
