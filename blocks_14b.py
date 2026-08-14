BLOCKS = {}

BLOCKS['heatmap'] = r'''import numpy as np
np.set_printoptions(precision=3, suppress=True)

# ============================================================
#  SEEING ATTENTION: A TEXT HEATMAP
#
#  Attention is just a table of numbers: "how much should
#  each word look at each other word?" Every row sums to 1.
#  Let's print that table and actually look at it.
# ============================================================

words = ["the", "cat", "sat", "on", "the", "mat"]

# Hand-made 4-dimensional "meaning" vectors, so the picture is readable.
# Real models LEARN these (Lecture 10) -- here we set them by hand so you
# can see the mechanism without training anything.
#            [animal, furniture, action,  glue-word]
meaning = {
    "the": [0.0, 0.0, 0.0, 1.0],
    "cat": [1.0, 0.0, 0.2, 0.0],
    "sat": [0.3, 0.3, 1.0, 0.0],
    "on":  [0.0, 0.2, 0.3, 0.8],
    "mat": [0.0, 1.0, 0.1, 0.0],
}
X = np.array([meaning[w] for w in words])
d_k = X.shape[1]

# Simplest possible attention: every word is its own query AND its own key
# (Lecture 13). Score = dot product, scaled by sqrt(d_k).
scores = X @ X.T / np.sqrt(d_k)
e = np.exp(scores - scores.max(-1, keepdims=True))
attn = e / e.sum(-1, keepdims=True)

SHADES = " .:-=+*#%@"


def heatmap(matrix, rows, cols, title):
    print(f"\n  {title}")
    print("            " + "".join(f"{c:>7}" for c in cols))
    for i, r in enumerate(rows):
        cells = ""
        for j in range(len(cols)):
            v = matrix[i, j]
            shade = SHADES[min(len(SHADES) - 1, int(v * len(SHADES)))]
            cells += f"  {v:.2f}{shade}"
        print(f"  {r:>8}  {cells}")


print("=" * 62)
print("  ATTENTION HEATMAP  (row = who is looking, col = what it sees)")
print("=" * 62)
heatmap(attn, words, words, "Attention weights")

print("\n  Every row sums to 1.0 -- attention SHARES OUT a fixed budget:")
for w, row in zip(words, attn):
    print(f"    {w:>5}: sum = {row.sum():.4f}")

print("\n  Read one row: where does 'cat' (row 2) look hardest?")
row = attn[1]
order = np.argsort(row)[::-1]
for rank, j in enumerate(order[:3], 1):
    print(f"    {rank}. '{words[j]}' with weight {row[j]:.3f}")
print("\n  'cat' attends most to itself and to 'sat' -- the words whose")
print("  meaning vectors point in a similar direction. That is the whole")
print("  idea: similar meaning -> larger dot product -> more attention.")
print("=" * 62)
'''

BLOCKS['mask'] = r'''import numpy as np

# ============================================================
#  WHAT THE CAUSAL MASK ACTUALLY DOES (Lecture 15 preview)
#
#  A language model must not peek at the future. The mask is
#  how we enforce that -- and it is visible in the heatmap.
# ============================================================

words = ["the", "cat", "sat", "on", "the", "mat"]
meaning = {
    "the": [0.0, 0.0, 0.0, 1.0], "cat": [1.0, 0.0, 0.2, 0.0],
    "sat": [0.3, 0.3, 1.0, 0.0], "on":  [0.0, 0.2, 0.3, 0.8],
    "mat": [0.0, 1.0, 0.1, 0.0],
}
X = np.array([meaning[w] for w in words])
T, d_k = X.shape
SHADES = " .:-=+*#%@"


def softmax(s):
    e = np.exp(s - s.max(-1, keepdims=True))
    return e / e.sum(-1, keepdims=True)


def show(matrix, title):
    print(f"\n  {title}")
    print("            " + "".join(f"{c:>7}" for c in words))
    for i, r in enumerate(words):
        cells = ""
        for j in range(T):
            v = matrix[i, j]
            shade = SHADES[min(len(SHADES) - 1, int(v * len(SHADES)))]
            cells += f"  {v:.2f}{shade}"
        print(f"  {r:>8}  {cells}")


scores = X @ X.T / np.sqrt(d_k)

print("=" * 62)
print("  BEFORE AND AFTER THE CAUSAL MASK")
print("=" * 62)
show(softmax(scores), "WITHOUT mask -- every word sees every word (cheating)")

# The mask: -1e9 above the diagonal. After softmax, e^(-1e9) = 0.
mask = np.triu(np.ones((T, T)), k=1) * (-1e9)
masked = softmax(scores + mask)
show(masked, "WITH causal mask -- upper triangle is exactly zero")

print("\n  Check that the future really is invisible:")
print(f"    weight of 'the'(pos 0) on 'mat'(pos 5) = {masked[0, 5]:.10f}")
print(f"    weight of 'mat'(pos 5) on 'the'(pos 0) = {masked[5, 0]:.10f}")

print("\n  Notice the first row: position 0 can only see itself, so its")
print("  weight is forced to 1.00. With nothing to compare against, the")
print("  first token's attention carries no information at all.")
print("\n  Why -1e9 and not 0? Because the mask is applied BEFORE softmax.")
print("  e^(-1e9) underflows to 0, so those positions get exactly zero")
print("  weight and the remaining weights still sum to 1.")
print("=" * 62)
'''

BLOCKS['heads'] = r'''import numpy as np
np.random.seed(7)

# ============================================================
#  WHY MORE THAN ONE HEAD? (Lecture 16 preview)
#
#  One attention head can only express ONE notion of
#  "related". Different heads learn different notions.
# ============================================================

words = ["the", "cat", "sat", "on", "the", "mat"]
meaning = {
    "the": [0.0, 0.0, 0.0, 1.0], "cat": [1.0, 0.0, 0.2, 0.0],
    "sat": [0.3, 0.3, 1.0, 0.0], "on":  [0.0, 0.2, 0.3, 0.8],
    "mat": [0.0, 1.0, 0.1, 0.0],
}
X = np.array([meaning[w] for w in words])
T, d = X.shape
SHADES = " .:-=+*#%@"


def softmax(s):
    e = np.exp(s - s.max(-1, keepdims=True))
    return e / e.sum(-1, keepdims=True)


def attend(x, Wq, Wk, causal=True):
    Q, K = x @ Wq, x @ Wk
    s = Q @ K.T / np.sqrt(Q.shape[-1])
    if causal:
        s = s + np.triu(np.ones((T, T)), k=1) * (-1e9)
    return softmax(s)


def show(m, title):
    print(f"\n  {title}")
    print("            " + "".join(f"{c:>7}" for c in words))
    for i, r in enumerate(words):
        cells = ""
        for j in range(T):
            v = m[i, j]
            cells += f"  {v:.2f}{SHADES[min(len(SHADES)-1, int(v*len(SHADES)))]}"
        print(f"  {r:>8}  {cells}")


print("=" * 62)
print("  THREE HEADS, THREE DIFFERENT IDEAS OF 'RELATED'")
print("=" * 62)

# Head A: hand-built to care about the ANIMAL dimension (index 0)
Wq_a = np.zeros((d, d)); Wq_a[0, 0] = 3.0
Wk_a = np.zeros((d, d)); Wk_a[0, 0] = 3.0

# Head B: hand-built to care about the FURNITURE dimension (index 1)
Wq_b = np.zeros((d, d)); Wq_b[1, 1] = 3.0
Wk_b = np.zeros((d, d)); Wk_b[1, 1] = 3.0

# Head C: random, like a head at the start of training
Wq_c = np.random.randn(d, d) * 0.8
Wk_c = np.random.randn(d, d) * 0.8

A = attend(X, Wq_a, Wk_a)
B = attend(X, Wq_b, Wk_b)
C = attend(X, Wq_c, Wk_c)

show(A, "HEAD A -- tuned to 'animal-ness'")
show(B, "HEAD B -- tuned to 'furniture-ness'")
show(C, "HEAD C -- random (untrained)")

print("\n  Look at the row for 'sat' (position 2) in each head:")
for name, M in [("A", A), ("B", B), ("C", C)]:
    row = M[2][:3]
    top = int(np.argmax(row))
    print(f"    head {name}: attends most to '{words[top]}' ({row[top]:.2f})"
          f"   [weights: " + " ".join(f"{v:.2f}" for v in row) + "]")

print("\n  Head A sends 'sat' strongly to 'cat' -- the only animal-ish word")
print("  it can see. Head B, which only reads the furniture dimension,")
print("  splits its attention quite differently. Same sentence, same")
print("  position, two different answers to 'what is relevant here?'")

print("\n  Now look at the LAST row of head A ('mat'):")
print("    " + " ".join(f"{v:.2f}" for v in A[-1]))
print("  It is perfectly uniform. Head A's query projection keeps only the")
print("  'animal' dimension, and 'mat' has zero in that dimension -- so its")
print("  query vector is all zeros, every score is identical, and softmax")
print("  returns a flat distribution. A head that cannot 'see' a token has")
print("  nothing to say about it, and falls back to attending everywhere.")
print("  That flat-row signature is worth remembering: in a real model it")
print("  usually means a head is dead or unused.")

print("\n  Head C is untrained and nearly uniform everywhere -- it has not")
print("  learned any notion of relatedness yet. A real model concatenates")
print("  all heads and projects them with Wo, so the next layer receives")
print("  ALL of these views at once.")
print("=" * 62)
'''

BLOCKS['entropy'] = r'''import numpy as np

# ============================================================
#  HOW FOCUSED IS EACH HEAD? (attention entropy)
#
#  Entropy answers "is this head pointing at one word, or
#  spreading itself thin?" -- a standard diagnostic when you
#  are debugging a model that will not learn (Lecture 29).
# ============================================================

words = ["the", "cat", "sat", "on", "the", "mat"]
meaning = {
    "the": [0.0, 0.0, 0.0, 1.0], "cat": [1.0, 0.0, 0.2, 0.0],
    "sat": [0.3, 0.3, 1.0, 0.0], "on":  [0.0, 0.2, 0.3, 0.8],
    "mat": [0.0, 1.0, 0.1, 0.0],
}
X = np.array([meaning[w] for w in words])
T, d = X.shape


def softmax(s):
    e = np.exp(s - s.max(-1, keepdims=True))
    return e / e.sum(-1, keepdims=True)


def causal_attn(x, scale):
    s = (x @ x.T) * scale
    s = s + np.triu(np.ones((T, T)), k=1) * (-1e9)
    return softmax(s)


def entropy(row, n_visible):
    p = row[:n_visible]
    p = p[p > 0]
    return float(-(p * np.log(p)).sum())


print("=" * 62)
print("  ATTENTION ENTROPY: FOCUSED vs DIFFUSE")
print("=" * 62)
print("  Entropy 0.00      = all weight on ONE word (sharp)")
print("  Entropy ln(n)     = spread evenly over n visible words (diffuse)")
print("-" * 62)

for label, scale in [("scale x0.1 (nearly flat)", 0.1),
                     ("scale x1.0 (normal)", 1.0),
                     ("scale x10  (very sharp)", 10.0)]:
    A = causal_attn(X, scale)
    ents, maxes = [], []
    for i in range(T):
        ents.append(entropy(A[i], i + 1))
        maxes.append(float(A[i, :i + 1].max()))
    print(f"\n  {label}")
    print(f"    mean entropy   : {np.mean(ents):.4f}")
    print(f"    mean max-weight: {np.mean(maxes):.4f}")
    print(f"    last row       : " + " ".join(f"{v:.2f}" for v in A[-1]))

print("\n" + "-" * 62)
print("  This is exactly why we divide by sqrt(d_k) (Lecture 13).")
print("  Dot products grow with dimension; unscaled, they push softmax")
print("  into the 'very sharp' regime above, where one weight is ~1.00")
print("  and the rest are ~0.00. Softmax gradients there are almost zero,")
print("  so the model stops learning. Scaling keeps entropy in a healthy")
print("  middle range where gradients still flow.")
print("=" * 62)

print("\n  MAXIMUM POSSIBLE ENTROPY per position (uniform over visible):")
for i in range(T):
    print(f"    position {i} sees {i+1} word(s): max entropy = {np.log(i+1):.4f}")
'''

if __name__ == '__main__':
    import subprocess, sys, tempfile, os
    ok = True
    for name, code in BLOCKS.items():
        with tempfile.NamedTemporaryFile('w', suffix='.py', delete=False) as f:
            f.write(code); p = f.name
        r = subprocess.run([sys.executable, p], capture_output=True, text=True, timeout=120)
        os.unlink(p)
        print(f"[{'PASS' if r.returncode==0 else 'FAIL'}] {name}  ({len(code)} chars)")
        if r.returncode:
            ok = False; print(r.stderr[-1500:])
        else:
            print('\n'.join('    ' + l for l in r.stdout.strip().split('\n')[:14]))
        print()
    sys.exit(0 if ok else 1)
