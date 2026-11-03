#!/usr/bin/env python3
"""
生成 Entro Serif 字体分片（Noto Serif CJK SC Medium 的按需加载子集）。

为什么要分片
    站点内容来自后端，标题 / 摘要里会出现任意汉字。随包自带的原始子集只有约 900 个汉字，
    用到其余汉字时浏览器会逐字回退到系统宋体，同一个标题里出现两种字形。
    这里把 GB2312 的 6763 个汉字 + 常用符号做成多个小文件，用 CSS unicode-range 让浏览器
    “页面上出现了哪个区段的字，才下载哪个文件”（和 Google Fonts 对 CJK 字体的做法一样）。

产物（都在仓库里，构建时由 Vite 打包，不需要每次运行本脚本）
    src/assets/fonts/entro-serif/entro-serif-base.woff2   首包：scripts/fonts/base-codepoints.txt 里的字形（首屏 preload）
    src/assets/fonts/entro-serif/entro-serif-sym.woff2    符号包：全角标点、假名、拉丁补充等
    src/assets/fonts/entro-serif/entro-serif-XXXX.woff2   汉字分片：按 Unicode 每 512 个码点一片，XXXX 是起始码点
    src/styles/fonts.css                                  对应的 @font-face（由本脚本生成，不要手改）

什么时候需要重新运行
    - 想调整首包内容（改 scripts/fonts/base-codepoints.txt）；
    - 想换覆盖范围（改下面的 EXTRA_CODEPOINTS / 汉字字集）。

用法
    pip install fonttools brotli
    python scripts/build-fonts.py --source /path/to/NotoSerifCJK-Medium.ttc
    # 源字体是 .ttc 时会自动选 “Noto Serif CJK SC” 那一款；也可以用 --font-number 手动指定。
    # 源字体可从 https://github.com/notofonts/noto-cjk 下载（SIL Open Font License 1.1，允许子集化再分发）。
"""
from __future__ import annotations

import argparse
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTCollection, TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT_DIR = os.path.join(ROOT, "src", "assets", "fonts", "entro-serif")
CSS_OUT = os.path.join(ROOT, "src", "styles", "fonts.css")
BASE_FILE = os.path.join(HERE, "fonts", "base-codepoints.txt")

FAMILY = "Entro Serif"
BLOCK = 512  # 每个汉字分片覆盖的码点数

# 非汉字的补充符号（范围，含两端）。只收源字体里确实有的字形。
SYMBOL_RANGES = [
    (0x00A0, 0x017F),  # Latin-1 补充 + 拉丁扩展 A
    (0x2000, 0x206F),  # 常用标点
    (0x2190, 0x21FF),  # 箭头
    (0x3000, 0x303F),  # CJK 符号和标点
    (0x3040, 0x30FF),  # 平假名、片假名
    (0xFF00, 0xFFEF),  # 全角 ASCII、半角假名
]


def parse_base(path: str) -> set[int]:
    out: set[int] = set()
    with open(path, encoding="utf8") as f:
        for line in f:
            line = line.split("#", 1)[0].strip()
            if not line:
                continue
            a, _, b = line.partition("-")
            lo = int(a, 16)
            hi = int(b, 16) if b else lo
            out.update(range(lo, hi + 1))
    return out


def gb2312_hanzi() -> set[int]:
    """GB2312 一级（3755）+ 二级（3008）汉字"""
    out: set[int] = set()
    for hi in range(0xB0, 0xF8):
        for lo in range(0xA1, 0xFF):
            try:
                ch = bytes([hi, lo]).decode("gb2312")
            except UnicodeDecodeError:
                continue
            out.add(ord(ch))
    return out


def fmt_ranges(cps: list[int]) -> str:
    cps = sorted(cps)
    parts: list[str] = []
    start = prev = None
    for c in cps:
        if start is None:
            start = prev = c
        elif c == prev + 1:
            prev = c
        else:
            parts.append((start, prev))
            start = prev = c
    if start is not None:
        parts.append((start, prev))
    return ",".join(f"U+{a:X}" if a == b else f"U+{a:X}-{b:X}" for a, b in parts)


def pick_font_number(path: str, explicit: int | None) -> int:
    if not path.lower().endswith(".ttc"):
        return 0
    if explicit is not None:
        return explicit
    ttc = TTCollection(path)
    for i, f in enumerate(ttc.fonts):
        if (f["name"].getDebugName(1) or "").startswith("Noto Serif CJK SC"):
            return i
    sys.exit("在 .ttc 里没找到 Noto Serif CJK SC，请用 --font-number 指定")


def make_subset(src: str, number: int, cps: set[int], out: str) -> int:
    opts = subset.Options()
    opts.flavor = "woff2"
    # 与随包自带的原始子集保持一致的取舍（字形轮廓逐点相同，体积差不多）：
    #  - 去掉 hinting：Noto CJK 的 CFF 里 hint 占了一半体积，屏幕渲染基本用不上；
    #  - 不保留 GSUB/GPOS 特性：站点只有横排中文，不需要竖排 / 比例字距等特性；
    #  - 丢掉竖排度量表；
    #  - 展开子程序：分片后子程序复用率低，展开后 brotli 压得更小。
    opts.hinting = False
    opts.layout_features = []
    opts.drop_tables += ["VORG", "vhea", "vmtx"]
    opts.desubroutinize = True
    opts.font_number = number  # .ttc 里的第几款字体（单个 .otf 时忽略）
    font = subset.load_font(src, opts)
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=sorted(cps))
    sub.subset(font)
    subset.save_font(font, out, opts)
    font.close()
    return os.path.getsize(out)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", required=True, help="Noto Serif CJK SC Medium 的 .ttc / .otf 路径")
    ap.add_argument("--font-number", type=int, default=None, help=".ttc 里的字体序号（默认自动选 SC）")
    args = ap.parse_args()

    number = pick_font_number(args.source, args.font_number)
    probe = TTFont(args.source, fontNumber=number)
    name = probe["name"].getDebugName(4)
    available = set(probe.getBestCmap())
    probe.close()
    print(f"源字体：{name}（序号 {number}，{len(available)} 个码点）")
    if "Serif" not in (name or "") or "SC" not in (name or ""):
        print("警告：源字体看起来不是 Noto Serif CJK SC，字形可能与现有首包不一致", file=sys.stderr)

    base = parse_base(BASE_FILE)
    missing_base = sorted(base - available)
    if missing_base:
        sys.exit("首包里有源字体没有的码点：" + fmt_ranges(missing_base))

    hanzi = gb2312_hanzi() & available
    symbols = {c for lo, hi in SYMBOL_RANGES for c in range(lo, hi + 1)} & available

    os.makedirs(OUT_DIR, exist_ok=True)
    for old in os.listdir(OUT_DIR):
        if old.startswith("entro-serif-") and old.endswith(".woff2"):
            os.remove(os.path.join(OUT_DIR, old))

    faces: list[tuple[str, str]] = []  # (文件名, unicode-range)，按 CSS 里的书写顺序
    total = 0

    # 汉字分片：每片只含“不在首包里的” GB2312 汉字；unicode-range 是整个 512 码点的区段
    for start in range(0x4E00, 0xA000, BLOCK):
        block = set(range(start, start + BLOCK))
        cps = (hanzi & block) - base
        if not cps:
            continue
        fname = f"entro-serif-{start:04x}.woff2"
        size = make_subset(args.source, number, cps, os.path.join(OUT_DIR, fname))
        total += size
        faces.append((fname, f"U+{start:X}-{start + BLOCK - 1:X}"))
        print(f"  {fname}  {len(cps):4d} 字  {size / 1024:6.1f} KB")

    # 符号分片
    sym_cps = symbols - base
    if sym_cps:
        fname = "entro-serif-sym.woff2"
        size = make_subset(args.source, number, sym_cps, os.path.join(OUT_DIR, fname))
        total += size
        faces.append((fname, fmt_ranges(sorted(sym_cps))))
        print(f"  {fname}  {len(sym_cps):4d} 字  {size / 1024:6.1f} KB")

    # 首包放最后：CSS 里后写的 @font-face 优先匹配，所以首包里的字永远只会命中首包，
    # 不会因为落在某个汉字分片的区段里而多下载一个文件
    fname = "entro-serif-base.woff2"
    size = make_subset(args.source, number, base, os.path.join(OUT_DIR, fname))
    total += size
    faces.append((fname, fmt_ranges(sorted(base))))
    print(f"  {fname}  {len(base):4d} 字  {size / 1024:6.1f} KB")

    lines = [
        "/* 由 scripts/build-fonts.py 生成，不要手改（说明见该脚本顶部）。",
        "   同一个 font-family 的多个 @font-face 用 unicode-range 分片：页面上出现了哪个区段的字，才下载对应文件；",
        "   后写的优先匹配，所以首包（base）放在最后。 */",
    ]
    for fname, rng in faces:
        lines.append(
            "@font-face {\n"
            f"  font-family: '{FAMILY}';\n"
            f"  src: url('../assets/fonts/entro-serif/{fname}') format('woff2');\n"
            "  font-display: swap;\n"
            f"  unicode-range: {rng};\n"
            "}"
        )
    with open(CSS_OUT, "w", encoding="utf8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"\n共 {len(faces)} 个文件，合计 {total / 1024:.0f} KB（页面只会下载用到的那几片）")
    print(f"已写入 {os.path.relpath(CSS_OUT, ROOT)}")


if __name__ == "__main__":
    main()
