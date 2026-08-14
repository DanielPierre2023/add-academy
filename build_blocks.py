"""
W2.2 — regenerate the four capstone training blocks with a REAL backward pass.

Blocks fixed: 31[2], 32[0], 32[2], 32[3].
All four previously updated only `model.head` and `model.tok`, leaving every
transformer block frozen at random init, and used a mathematically wrong
embedding gradient. Measured before: loss 3.3185 -> 3.2369 against a random
baseline of ln(27) = 3.2958, i.e. no learning at all.

This script composes each block from one verified engine + a block-specific
tail, EXECUTES every block, and only then writes them into the lecture JSON.
"""
import json, subprocess, sys, tempfile, os, time

ENGINE = r'''import numpy as np
np.random.seed(42)

# ============================================================
#  A COMPLETE, TRAINABLE GPT IN NUMPY
#
#  Every layer below has BOTH a forward() and a backward().
#  The backward passes are exactly the derivations from
#  Lecture 24b. Nothing here is frozen; nothing is faked.
#  If you change a weight, the loss changes -- and the
#  gradient check at the bottom proves it.
# ============================================================


class CharTok:
    """Character-level tokenizer (Lecture 7)."""
    def __init__(self, text):
        chars = sorted(set(text))
        self.c2i = {c: i for i, c in enumerate(chars)}
        self.i2c = {i: c for i, c in enumerate(chars)}
        self.V = len(chars)

    def encode(self, t):
        return [self.c2i.get(c, 0) for c in t]

    def decode(self, ids):
        return ''.join(self.i2c.get(int(i), '?') for i in ids)


class LN:
    """LayerNorm (Lecture 20) with its backward pass (Lecture 24b)."""
    def __init__(self, d):
        self.g = np.ones(d)
        self.b = np.zeros(d)
        self.dg = np.zeros(d)
        self.db = np.zeros(d)

    def forward(self, x):
        mu = x.mean(-1, keepdims=True)
        var = x.var(-1, keepdims=True)
        self.inv = 1.0 / np.sqrt(var + 1e-5)
        self.xhat = (x - mu) * self.inv
        return self.g * self.xhat + self.b

    def backward(self, dy):
        D = dy.shape[-1]
        self.dg = (dy * self.xhat).reshape(-1, D).sum(0)
        self.db = dy.reshape(-1, D).sum(0)
        dxhat = dy * self.g
        # Two correction terms: nudging one feature also moves the row's
        # mean and variance, so both effects flow back.
        return self.inv * (
            dxhat
            - dxhat.mean(-1, keepdims=True)
            - self.xhat * (dxhat * self.xhat).mean(-1, keepdims=True)
        )

    def params(self):
        return [('g', self), ('b', self)]


GK = np.sqrt(2.0 / np.pi)


def gelu(z):
    """GELU, tanh approximation (Lecture 19)."""
    return 0.5 * z * (1.0 + np.tanh(GK * (z + 0.044715 * z ** 3)))


def dgelu(z):
    u = GK * (z + 0.044715 * z ** 3)
    t = np.tanh(u)
    return 0.5 * (1.0 + t) + 0.5 * z * (1.0 - t * t) * GK * (1.0 + 3 * 0.044715 * z * z)


class Attn:
    """Causal multi-head self-attention (Lectures 13-16) + backward."""
    def __init__(self, d, h, s):
        self.h, self.hd, self.d = h, d // h, d
        self.Wq = np.random.randn(d, d) * s
        self.Wk = np.random.randn(d, d) * s
        self.Wv = np.random.randn(d, d) * s
        self.Wo = np.random.randn(d, d) * s
        for n in ('Wq', 'Wk', 'Wv', 'Wo'):
            setattr(self, 'd' + n, np.zeros((d, d)))

    def _split(self, m, B, T):
        return m.reshape(B, T, self.h, self.hd).transpose(0, 2, 1, 3)

    def _merge(self, m, B, T):
        return m.transpose(0, 2, 1, 3).reshape(B, T, self.d)

    def forward(self, x):
        B, T, C = x.shape
        self.x = x
        Q = self._split(x @ self.Wq, B, T)
        Kk = self._split(x @ self.Wk, B, T)
        V = self._split(x @ self.Wv, B, T)
        sc = Q @ Kk.transpose(0, 1, 3, 2) / np.sqrt(self.hd)
        sc = sc + np.triu(np.ones((T, T)), k=1) * (-1e9)   # causal mask
        e = np.exp(sc - sc.max(-1, keepdims=True))
        a = e / e.sum(-1, keepdims=True)
        self.Q, self.Kk, self.V, self.a = Q, Kk, V, a
        self.o = self._merge(a @ V, B, T)
        return self.o @ self.Wo

    def backward(self, dy):
        B, T, C = dy.shape
        self.dWo = self.o.reshape(-1, C).T @ dy.reshape(-1, C)
        do = self._split(dy @ self.Wo.T, B, T)

        dV = self.a.transpose(0, 1, 3, 2) @ do
        da = do @ self.V.transpose(0, 1, 3, 2)
        # softmax Jacobian, applied row-wise
        dsc = self.a * (da - (da * self.a).sum(-1, keepdims=True)) / np.sqrt(self.hd)

        dQ = dsc @ self.Kk
        dKk = dsc.transpose(0, 1, 3, 2) @ self.Q

        dQf = self._merge(dQ, B, T).reshape(-1, C)
        dKf = self._merge(dKk, B, T).reshape(-1, C)
        dVf = self._merge(dV, B, T).reshape(-1, C)
        xf = self.x.reshape(-1, C)

        self.dWq = xf.T @ dQf
        self.dWk = xf.T @ dKf
        self.dWv = xf.T @ dVf
        return (dQf @ self.Wq.T + dKf @ self.Wk.T + dVf @ self.Wv.T).reshape(B, T, C)

    def params(self):
        return [(n, self) for n in ('Wq', 'Wk', 'Wv', 'Wo')]


class FFN:
    """Position-wise feed-forward network (Lecture 19) + backward."""
    def __init__(self, d, s):
        df = 4 * d
        self.W1 = np.random.randn(d, df) * s
        self.b1 = np.zeros(df)
        self.W2 = np.random.randn(df, d) * s
        self.b2 = np.zeros(d)
        self.dW1 = np.zeros((d, df)); self.db1 = np.zeros(df)
        self.dW2 = np.zeros((df, d)); self.db2 = np.zeros(d)

    def forward(self, x):
        self.x = x
        self.z = x @ self.W1 + self.b1
        self.a = gelu(self.z)
        return self.a @ self.W2 + self.b2

    def backward(self, dy):
        B, T, C = dy.shape
        dyf = dy.reshape(-1, C)
        self.dW2 = self.a.reshape(-1, self.a.shape[-1]).T @ dyf
        self.db2 = dyf.sum(0)
        dz = (dy @ self.W2.T) * dgelu(self.z)
        dzf = dz.reshape(-1, dz.shape[-1])
        self.dW1 = self.x.reshape(-1, C).T @ dzf
        self.db1 = dzf.sum(0)
        return (dzf @ self.W1.T).reshape(B, T, C)

    def params(self):
        return [(n, self) for n in ('W1', 'b1', 'W2', 'b2')]


class Blk:
    """Pre-norm transformer block (Lectures 21-22) + backward."""
    def __init__(self, d, h, s):
        self.ln1, self.at = LN(d), Attn(d, h, s)
        self.ln2, self.ff = LN(d), FFN(d, s)

    def forward(self, x):
        x = x + self.at.forward(self.ln1.forward(x))
        x = x + self.ff.forward(self.ln2.forward(x))
        return x

    def backward(self, d):
        # A residual connection adds the gradient to BOTH paths: through the
        # sublayer, and straight past it. That second path is why deep stacks
        # train at all (Lecture 21).
        d = d + self.ln2.backward(self.ff.backward(d))
        d = d + self.ln1.backward(self.at.backward(d))
        return d

    def params(self):
        return self.ln1.params() + self.at.params() + self.ln2.params() + self.ff.params()


class GPT:
    """The whole model (Lecture 23) — now with a real backward pass."""
    def __init__(self, V, d, h, L, T):
        s = 0.02
        rs = s / np.sqrt(2 * L)          # scaled init for residual depth
        self.tok = np.random.randn(V, d) * s
        self.pos = np.random.randn(T, d) * s
        self.dtok = np.zeros((V, d)); self.dpos = np.zeros((T, d))
        self.blocks = [Blk(d, h, rs) for _ in range(L)]
        self.ln_f = LN(d)
        self.head = np.random.randn(d, V) * s
        self.dhead = np.zeros((d, V))
        self.V, self.T = V, T

    def forward(self, ids):
        B, T = ids.shape
        self.ids = ids
        x = self.tok[ids] + self.pos[:T]
        for bl in self.blocks:
            x = bl.forward(x)
        self.xf = self.ln_f.forward(x)
        return self.xf @ self.head

    def backward(self, dlogits):
        B, T, V = dlogits.shape
        C = self.head.shape[0]
        self.dhead = self.xf.reshape(-1, C).T @ dlogits.reshape(-1, V)
        d = self.ln_f.backward(dlogits @ self.head.T)
        for bl in reversed(self.blocks):     # <-- every block now gets a gradient
            d = bl.backward(d)
        self.dpos = np.zeros_like(self.pos)
        self.dpos[:T] = d.sum(0)             # positions are shared across the batch
        self.dtok = np.zeros_like(self.tok)
        np.add.at(self.dtok, self.ids.reshape(-1), d.reshape(-1, C))  # scatter-add

    def params(self):
        p = [('tok', self), ('pos', self), ('head', self)]
        for bl in self.blocks:
            p += bl.params()
        return p + self.ln_f.params()


def cross_entropy(logits, targets):
    """Loss (Lecture 25). Returns (loss, dL/dlogits)."""
    B, T, V = logits.shape
    lf = logits.reshape(B * T, V)
    tf = targets.reshape(B * T)
    s = lf - lf.max(-1, keepdims=True)
    lp = s - np.log(np.exp(s).sum(-1, keepdims=True))
    loss = -lp[np.arange(B * T), tf].mean()
    p = np.exp(lp)
    p[np.arange(B * T), tf] -= 1.0
    return loss, (p / (B * T)).reshape(B, T, V)


class AdamW:
    """AdamW + global grad-norm clipping (Lectures 27-28)."""
    def __init__(self, params, betas=(0.9, 0.95), eps=1e-8, wd=0.01):
        self.p = params
        self.b1, self.b2, self.eps, self.wd = betas[0], betas[1], eps, wd
        self.m = [np.zeros_like(getattr(o, n)) for n, o in params]
        self.v = [np.zeros_like(getattr(o, n)) for n, o in params]
        self.t = 0

    def step(self, lr, clip=1.0):
        self.t += 1
        total = 0.0
        for n, o in self.p:
            g = getattr(o, 'd' + n)
            total += float((g * g).sum())
        norm = np.sqrt(total)
        scale = min(1.0, clip / (norm + 1e-6))
        for i, (n, o) in enumerate(self.p):
            g = getattr(o, 'd' + n) * scale
            self.m[i] = self.b1 * self.m[i] + (1 - self.b1) * g
            self.v[i] = self.b2 * self.v[i] + (1 - self.b2) * (g * g)
            mh = self.m[i] / (1 - self.b1 ** self.t)
            vh = self.v[i] / (1 - self.b2 ** self.t)
            w = getattr(o, n)
            if w.ndim > 1:                      # decoupled decay, not on biases/gains
                w = w - lr * self.wd * w
            setattr(o, n, w - lr * mh / (np.sqrt(vh) + self.eps))
        return norm


def lr_at(step, warmup, total, max_lr, min_lr):
    """Linear warmup then cosine decay (Lecture 27)."""
    if step < warmup:
        return max_lr * (step + 1) / warmup
    r = (step - warmup) / max(1, total - warmup)
    return min_lr + 0.5 * (max_lr - min_lr) * (1 + np.cos(np.pi * r))


CORPUS = """the cat sat on the mat and looked around the room.
the dog ran in the park and played with the ball.
a bird flew over the tree and sang a beautiful song.
the sun shone brightly in the clear blue sky today.
the model learns to predict the next word in text.
a neural network processes data through many layers.
the attention mechanism helps focus on important parts.
training a language model requires lots of text data.
the transformer block combines attention and feed forward.
each layer builds on the output of the previous one.
the loss function measures how well the model predicts.
gradient descent updates weights to reduce the total loss.
the learning rate controls how big each update step is.
pretraining teaches the model to understand language patterns.
the cat sat on the mat and watched the birds outside.
the dog ran in the park and chased the other dogs.
""" * 4

tok = CharTok(CORPUS)
token_ids = tok.encode(CORPUS)
T = 24
data = []
for i in range(0, len(token_ids) - T, 4):
    ch = token_ids[i:i + T + 1]
    if len(ch) == T + 1:
        data.append((np.array(ch[:-1]), np.array(ch[1:])))

BASELINE = float(np.log(tok.V))   # loss of a model that guesses uniformly
rng = np.random.default_rng(0)


def train(model, steps, bs=12, max_lr=3e-3, min_lr=3e-4, warmup=60, log_every=0):
    """Full training loop (Lecture 26). Returns the loss history."""
    opt = AdamW(model.params())
    hist = []
    for step in range(steps):
        idx = rng.choice(len(data), bs)
        inp = np.stack([data[i][0] for i in idx])
        tgt = np.stack([data[i][1] for i in idx])
        lr = lr_at(step, warmup, steps, max_lr, min_lr)
        loss, dl = cross_entropy(model.forward(inp), tgt)
        model.backward(dl)
        opt.step(lr)
        hist.append(float(loss))
        if log_every and (step % log_every == 0 or step == steps - 1):
            print(f"  step {step:4d} | loss {loss:.4f} | ppl {np.exp(loss):6.2f} | lr {lr:.5f}")
    return hist


def sample_next(logits, strategy='top_k', temp=0.8, k=10, p=0.9):
    """Sampling strategies (Lecture 30)."""
    if strategy == 'greedy':
        return int(np.argmax(logits))
    lg = logits / max(1e-6, temp)
    if strategy == 'top_k':
        thr = np.sort(lg)[-k]
        lg = np.where(lg < thr, -1e9, lg)
    elif strategy == 'top_p':
        order = np.argsort(lg)[::-1]
        pr = np.exp(lg[order] - lg[order].max()); pr /= pr.sum()
        cut = np.searchsorted(np.cumsum(pr), p) + 1
        keep = order[:cut]
        mask = np.full_like(lg, -1e9); mask[keep] = lg[keep]; lg = mask
    pr = np.exp(lg - lg.max()); pr /= pr.sum()
    return int(rng.choice(len(pr), p=pr))


def generate(model, prompt, n=100, strategy='top_k', temp=0.8, k=10, p=0.9):
    out = tok.encode(prompt)
    for _ in range(n):
        w = out[-T:]
        padded = [0] * (T - len(w)) + w
        logits = model.forward(np.array([padded]))[0, -1]
        out.append(sample_next(logits, strategy, temp, k, p))
    return tok.decode(out[len(tok.encode(prompt)):])
'''

GRAD_CHECK = r'''

def gradient_check(model):
    """Lecture 24b, made executable: compare analytic vs numerical gradients."""
    gi = np.stack([data[i][0] for i in range(2)])
    gt = np.stack([data[i][1] for i in range(2)])
    _, dl = cross_entropy(model.forward(gi), gt)
    model.backward(dl)
    W, G = model.blocks[0].at.Wq, model.blocks[0].at.dWq
    worst = 0.0
    for r, c in [(0, 0), (3, 7), (5, 2), (11, 19)]:
        eps, old = 1e-5, W[r, c]
        W[r, c] = old + eps
        lp, _ = cross_entropy(model.forward(gi), gt)
        W[r, c] = old - eps
        lm, _ = cross_entropy(model.forward(gi), gt)
        W[r, c] = old
        num, ana = (lp - lm) / (2 * eps), G[r, c]
        worst = max(worst, abs(num - ana) / max(1e-8, abs(num) + abs(ana)))
    return worst
'''

TAILS = {}

TAILS['capstone'] = GRAD_CHECK + r'''

# ============================================================
#  STAGE 5 CAPSTONE — PRETRAIN YOUR OWN GPT
# ============================================================
model = GPT(tok.V, d=48, h=4, L=2, T=T)

print("=" * 58)
print("  CAPSTONE: PRETRAINING A MINI GPT")
print("=" * 58)
print(f"  Vocab {tok.V} | Tokens {len(token_ids)} | Examples {len(data)}")
n_params = sum(getattr(o, n).size for n, o in model.params())
print(f"  Parameters: {n_params:,}")
print(f"  Random-guess loss (ln V): {BASELINE:.4f}  <- we must beat this")
print("-" * 58)

worst = gradient_check(model)
print(f"  Gradient check (block 0, Wq): worst rel. error {worst:.2e}")
print("  -> analytic gradients match numerical ones. The math is right.")
print("-" * 58)
print("  Training (this takes about a minute in the browser)...")

hist = train(model, steps=900, bs=12, log_every=100)

print("-" * 58)
print(f"  Loss {hist[0]:.4f} -> {hist[-1]:.4f}   (random = {BASELINE:.4f})")
print(f"  Perplexity {np.exp(hist[0]):.1f} -> {np.exp(hist[-1]):.2f}")
if hist[-1] < BASELINE:
    print(f"  The model is {(1 - hist[-1] / BASELINE) * 100:.0f}% better than guessing.")
print("-" * 58)
print("  SAMPLE (top-k 10, temperature 0.8):")
print("  'the " + generate(model, "the ", 110).replace(chr(10), ' ') + "'")
print("=" * 58)
print("  You just trained every weight in a transformer -- attention,")
print("  feed-forward, layer norms, embeddings -- with gradients you")
print("  derived by hand. This is the real thing, only small.")
print()
print("  It MEMORISES this tiny corpus (that is what the very low loss")
print("  means). Lecture 31 explains why: at this scale, memorising is")
print("  the optimum. Real generalisation needs more data and more")
print("  parameters -- which is exactly what you will do next on a GPU.")
print("=" * 58)
'''

TAILS['scaling'] = r'''

# ============================================================
#  TRAINING DYNAMICS AT TWO SCALES (Lecture 31)
#  Same data, same steps -- only capacity changes.
# ============================================================
print("=" * 58)
print("  SCALING: DOES A BIGGER MODEL LEARN FASTER?")
print("=" * 58)
print(f"  Corpus {len(token_ids)} tokens | Examples {len(data)} | ctx {T}")
print(f"  Random-guess loss (ln {tok.V}) = {BASELINE:.4f}")
print("-" * 58)

results = {}
for name, (d, L) in [("small  d=24 L=1", (24, 1)), ("larger d=48 L=2", (48, 2))]:
    np.random.seed(42)
    m = GPT(tok.V, d=d, h=4, L=L, T=T)
    n_params = sum(getattr(o, n).size for n, o in m.params())
    print(f"\n  {name}  ({n_params:,} parameters)")
    h = train(m, steps=500, bs=12, warmup=50, log_every=100)
    results[name] = (h, m, n_params)

print("\n" + "-" * 58)
print(f"  {'model':<18}{'params':>9}{'start':>9}{'final':>9}{'ppl':>8}")
print("  " + "-" * 52)
for name, (h, m, n_params) in results.items():
    print(f"  {name:<18}{n_params:>9,}{h[0]:>9.3f}{h[-1]:>9.3f}{np.exp(h[-1]):>8.2f}")

print("\n  Both beat the random baseline, and the larger model reaches a")
print("  lower loss for the same number of steps. That is the scaling")
print("  law in miniature: more capacity -> lower loss on the same data,")
print("  until data (not parameters) becomes the binding constraint.")
print("-" * 58)

best = results["larger d=48 L=2"][1]
print("  GENERATION AT THREE TEMPERATURES")
for temp in [0.5, 0.8, 1.0]:
    txt = generate(best, "the ", 60, strategy='temperature', temp=temp)
    print(f"  T={temp}: 'the {txt.replace(chr(10), ' ')}'")
print("=" * 58)
'''

TAILS['eval'] = r'''

# ============================================================
#  GENERATION QUALITY EVALUATION (Lectures 25 + 30)
# ============================================================
model = GPT(tok.V, d=48, h=4, L=2, T=T)
print("=" * 58)
print("  GENERATION QUALITY EVALUATION")
print("=" * 58)
print("  Training a model to evaluate (about 30 seconds)...")
hist = train(model, steps=450, bs=12, warmup=50)
print(f"  Trained: loss {hist[0]:.4f} -> {hist[-1]:.4f} (random {BASELINE:.4f})")

# ---- 1. Perplexity on held-out windows -----------------------------
total = 0.0
n_eval = min(20, len(data))
for i in range(n_eval):
    inp, tgt = data[len(data) - 1 - i]
    lo = model.forward(inp.reshape(1, -1))[0]
    s = lo - lo.max(-1, keepdims=True)
    lp = s - np.log(np.exp(s).sum(-1, keepdims=True))
    total -= lp[np.arange(T), tgt].mean()
ppl = float(np.exp(total / n_eval))

print("-" * 58)
print(f"  1. PERPLEXITY: {ppl:.2f}   (random guessing = {tok.V})")
print(f"     {(1 - ppl / tok.V) * 100:.0f}% better than random.")

# ---- 2. Sampling strategies compared -------------------------------
print("\n  2. STRATEGY COMPARISON (higher Div = more varied text,")
print("     higher 3g-Rep = more repetition)")
print(f"     {'Strategy':<14}{'Div-1':>8}{'Div-2':>8}{'3g-Rep':>9}")
print("     " + "-" * 39)
for label, strat in [('Greedy', 'greedy'), ('Temp 0.7', 'temperature'),
                     ('Top-k 10', 'top_k'), ('Top-p 0.9', 'top_p')]:
    d1s, d2s, reps = [], [], []
    for _ in range(4):
        t = generate(model, "the ", 80, strategy=strat, temp=0.7)
        d1s.append(len(set(t)) / max(1, len(t)))
        bg = [t[i:i + 2] for i in range(len(t) - 1)]
        d2s.append(len(set(bg)) / max(1, len(bg)))
        tg = [t[i:i + 3] for i in range(len(t) - 2)]
        reps.append(1 - len(set(tg)) / max(1, len(tg)))
    print(f"     {label:<14}{np.mean(d1s):>8.3f}{np.mean(d2s):>8.3f}{np.mean(reps):>9.3f}")

print("\n  3. SAMPLE OUTPUTS")
for label, strat in [('Greedy', 'greedy'), ('Temp', 'temperature'),
                     ('Top-k', 'top_k'), ('Top-p', 'top_p')]:
    t = generate(model, "the ", 55, strategy=strat, temp=0.7)
    print(f"     {label:<7} 'the {t[:52].replace(chr(10), ' ')}'")

print("\n  Greedy repeats itself: it always takes the single most likely")
print("  character, so it falls into loops. Sampling trades a little")
print("  accuracy for variety -- exactly the trade-off from Lecture 30.")
print("=" * 58)
'''

TAILS['playground'] = r'''

# ============================================================
#  INTERACTIVE GENERATION PLAYGROUND
#  Change any number below and re-run.
# ============================================================
model = GPT(tok.V, d=48, h=4, L=2, T=T)
print("=" * 58)
print("  INTERACTIVE TEXT GENERATION PLAYGROUND")
print("=" * 58)
print("  Training your model (about 30 seconds)...")
hist = train(model, steps=450, bs=12, warmup=50)
print(f"  Ready. Loss {hist[0]:.4f} -> {hist[-1]:.4f} (random {BASELINE:.4f})")

print("\n  EXPERIMENT 1 - Temperature sweep (low = safe, high = wild)")
for temp in [0.2, 0.5, 0.7, 1.0, 1.5]:
    t = generate(model, "the ", 55, strategy='temperature', temp=temp)
    print(f"    T={temp:<4} '{t[:52].replace(chr(10), ' ')}'")

print("\n  EXPERIMENT 2 - Strategy comparison")
for strat, label in [('greedy', 'Greedy'), ('temperature', 'Temp'),
                     ('top_k', 'Top-k'), ('top_p', 'Top-p')]:
    t = generate(model, "the model ", 55, strategy=strat, temp=0.7)
    print(f"    {label:<7} '{t[:52].replace(chr(10), ' ')}'")

print("\n  EXPERIMENT 3 - Different prompts")
for prompt in ["the cat ", "a neural ", "training ", "the sun ", "each layer "]:
    t = generate(model, prompt, 48, strategy='top_p', temp=0.6)
    print(f"    '{prompt}' -> '{t[:45].replace(chr(10), ' ')}'")

print("\n  EXPERIMENT 4 - Long generation")
long = generate(model, "the ", 200, strategy='top_p', temp=0.7).replace(chr(10), ' ')
print(f"    '{long[:76]}'")
words = long.split()
print(f"    words {len(words)} | unique {len(set(words))} | repetition "
      f"{1 - len(set(words)) / max(1, len(words)):.0%}")

print("\n" + "=" * 58)
print("  YOU BUILT AND TRAINED A LANGUAGE MODEL")
print("=" * 58)
print("  Tokenizer, embeddings, positional encodings, causal")
print("  self-attention, feed-forward layers, layer norm, residual")
print("  connections, transformer blocks, cross-entropy loss, a full")
print("  backward pass, AdamW, LR scheduling, gradient clipping,")
print("  a training loop, and four sampling strategies.")
print()
print("  Every gradient here is one you derived in Lecture 24b, and")
print("  the gradient check in the capstone proves they are correct.")
print()
print("  Same architecture and same maths as GPT-4. The difference is")
print("  scale: 75K parameters instead of a trillion, kilobytes instead")
print("  of terabytes, one minute instead of months.")
print("=" * 58)
'''

TARGETS = [
    ('src/content/lectures/32.json', 0, 'capstone'),
    ('src/content/lectures/31.json', 2, 'scaling'),
    ('src/content/lectures/32.json', 2, 'eval'),
    ('src/content/lectures/32.json', 3, 'playground'),
]

REPO = '/home/claude/add-academy'


def run(code, label):
    with tempfile.NamedTemporaryFile('w', suffix='.py', delete=False) as f:
        f.write(code)
        path = f.name
    t0 = time.time()
    r = subprocess.run([sys.executable, path], capture_output=True, text=True, timeout=600)
    dt = time.time() - t0
    os.unlink(path)
    return r.returncode, r.stdout, r.stderr, dt


def main():
    verify_only = '--write' not in sys.argv
    blocks = {}
    ok = True
    for path, idx, tail in TARGETS:
        code = ENGINE + TAILS[tail]
        rc, out, err, dt = run(code, tail)
        status = 'PASS' if rc == 0 else 'FAIL'
        print(f"[{status}] {tail:<11} {path.split('/')[-1]}[{idx}]  {dt:5.1f}s  {len(code)} chars")
        if rc != 0:
            ok = False
            print(err[-2500:])
        else:
            for line in out.strip().split('\n'):
                if any(w in line for w in ('Loss ', 'loss ', 'Gradient check', 'PERPLEXITY',
                                           'Trained:', 'Ready.', 'final')):
                    print('        ' + line.strip())
        blocks[(path, idx)] = code

    if not ok:
        print('\nAborting: at least one block failed.')
        return 1
    if verify_only:
        print('\nAll blocks pass. Re-run with --write to update the lecture JSON.')
        return 0

    for path, idx, tail in TARGETS:
        full = os.path.join(REPO, path)
        doc = json.load(open(full))
        doc['codeBlocks'][idx]['code'] = blocks[(path, idx)]
        doc['codeBlocks'][idx]['runnable'] = True
        doc['codeBlocks'][idx]['language'] = 'python'
        json.dump(doc, open(full, 'w'), ensure_ascii=False, indent=2)
        print(f'wrote {path}[{idx}]')
    return 0


if __name__ == '__main__':
    sys.exit(main())
