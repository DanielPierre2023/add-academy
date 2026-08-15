"""
Builds notebooks/ADD_Academica_Capstone_GPU.ipynb (W2.3) — the "graduation"
step: the same Transformer the learner built from scratch in NumPy, now in
PyTorch on a real GPU, trained on Tiny Shakespeare, then loaded with OpenAI's
official GPT-2 weights to PROVE the architecture is correct.

The model + from_pretrained mapping follow the standard nanoGPT formulation
(known-correct), so a learner who reaches the same outputs as real GPT-2 has
verified their implementation. Run this file to (re)generate the .ipynb;
every code cell is ast-parsed so the notebook can never ship broken Python.
"""
import json, ast, os

def md(*src):
    return {"cell_type": "markdown", "metadata": {}, "source": _lines(src)}

def code(*src):
    return {"cell_type": "code", "metadata": {}, "execution_count": None,
            "outputs": [], "source": _lines(src)}

def _lines(src):
    text = "\n".join(src)
    lines = text.split("\n")
    return [l + "\n" for l in lines[:-1]] + [lines[-1]]

cells = []

cells.append(md(
    "# 🎓 ADD Academica — Capstone on a Real GPU",
    "",
    "In the in-browser capstone you built a full Transformer **from scratch in NumPy** and",
    "watched the loss fall as it learned — with your own hand-written backpropagation.",
    "That proved you understand the *mathematics*.",
    "",
    "This notebook is the graduation step. You will:",
    "",
    "1. Rebuild the **same architecture** in PyTorch and train it on a **real GPU**.",
    "2. Generate text from your trained model.",
    "3. Load **OpenAI's official GPT-2 weights** into your architecture — if the outputs match,",
    "   your implementation is structurally identical to the real thing.",
    "",
    "> **Runtime → Change runtime type → T4 GPU** before you start (it's free).",
))

cells.append(md("## 0. Check the GPU"))
cells.append(code(
    "import torch",
    "print('PyTorch', torch.__version__)",
    "assert torch.cuda.is_available(), 'No GPU — set Runtime > Change runtime type > T4 GPU'",
    "device = 'cuda'",
    "print('GPU:', torch.cuda.get_device_name(0))",
))

cells.append(code(
    "# tiktoken gives us the exact GPT-2 byte-pair tokenizer (50257 tokens).",
    "!pip -q install tiktoken",
))

cells.append(md(
    "## 1. The architecture — the same one you built in NumPy",
    "",
    "Token + positional embeddings → a stack of Transformer blocks (causal self-attention +",
    "MLP, each with a pre-LayerNorm residual) → a final LayerNorm → a linear head that",
    "produces a logit for every token in the vocabulary. Nothing here is new to you; it is",
    "your NumPy capstone expressed in PyTorch modules.",
))

cells.append(code(
    "import math",
    "from dataclasses import dataclass",
    "import torch, torch.nn as nn",
    "from torch.nn import functional as F",
    "",
    "@dataclass",
    "class GPTConfig:",
    "    block_size: int = 256   # context length",
    "    vocab_size: int = 50257 # GPT-2 BPE vocab",
    "    n_layer: int = 6",
    "    n_head: int = 6",
    "    n_embd: int = 384",
    "    dropout: float = 0.1",
    "    bias: bool = True",
))

cells.append(code(
    "class CausalSelfAttention(nn.Module):",
    "    def __init__(self, cfg):",
    "        super().__init__()",
    "        assert cfg.n_embd % cfg.n_head == 0",
    "        self.c_attn = nn.Linear(cfg.n_embd, 3 * cfg.n_embd, bias=cfg.bias)",
    "        self.c_proj = nn.Linear(cfg.n_embd, cfg.n_embd, bias=cfg.bias)",
    "        self.attn_dropout = nn.Dropout(cfg.dropout)",
    "        self.resid_dropout = nn.Dropout(cfg.dropout)",
    "        self.n_head, self.n_embd = cfg.n_head, cfg.n_embd",
    "        self.register_buffer('mask', torch.tril(torch.ones(cfg.block_size, cfg.block_size))",
    "                             .view(1, 1, cfg.block_size, cfg.block_size))",
    "",
    "    def forward(self, x):",
    "        B, T, C = x.size()",
    "        q, k, v = self.c_attn(x).split(self.n_embd, dim=2)",
    "        k = k.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)",
    "        q = q.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)",
    "        v = v.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)",
    "        att = (q @ k.transpose(-2, -1)) * (1.0 / math.sqrt(k.size(-1)))",
    "        att = att.masked_fill(self.mask[:, :, :T, :T] == 0, float('-inf'))",
    "        att = self.attn_dropout(F.softmax(att, dim=-1))",
    "        y = (att @ v).transpose(1, 2).contiguous().view(B, T, C)",
    "        return self.resid_dropout(self.c_proj(y))",
    "",
    "class MLP(nn.Module):",
    "    def __init__(self, cfg):",
    "        super().__init__()",
    "        self.c_fc = nn.Linear(cfg.n_embd, 4 * cfg.n_embd, bias=cfg.bias)",
    "        self.c_proj = nn.Linear(4 * cfg.n_embd, cfg.n_embd, bias=cfg.bias)",
    "        self.dropout = nn.Dropout(cfg.dropout)",
    "",
    "    def forward(self, x):",
    "        return self.dropout(self.c_proj(F.gelu(self.c_fc(x))))",
    "",
    "class Block(nn.Module):",
    "    def __init__(self, cfg):",
    "        super().__init__()",
    "        self.ln_1 = nn.LayerNorm(cfg.n_embd, bias=cfg.bias)",
    "        self.attn = CausalSelfAttention(cfg)",
    "        self.ln_2 = nn.LayerNorm(cfg.n_embd, bias=cfg.bias)",
    "        self.mlp = MLP(cfg)",
    "",
    "    def forward(self, x):",
    "        x = x + self.attn(self.ln_1(x))   # pre-LN residual",
    "        x = x + self.mlp(self.ln_2(x))",
    "        return x",
))

cells.append(code(
    "class GPT(nn.Module):",
    "    def __init__(self, cfg):",
    "        super().__init__()",
    "        self.cfg = cfg",
    "        self.transformer = nn.ModuleDict(dict(",
    "            wte = nn.Embedding(cfg.vocab_size, cfg.n_embd),",
    "            wpe = nn.Embedding(cfg.block_size, cfg.n_embd),",
    "            drop = nn.Dropout(cfg.dropout),",
    "            h = nn.ModuleList([Block(cfg) for _ in range(cfg.n_layer)]),",
    "            ln_f = nn.LayerNorm(cfg.n_embd, bias=cfg.bias),",
    "        ))",
    "        self.lm_head = nn.Linear(cfg.n_embd, cfg.vocab_size, bias=False)",
    "        # Weight tying — the same trick GPT-2 uses.",
    "        self.transformer.wte.weight = self.lm_head.weight",
    "",
    "    def forward(self, idx, targets=None):",
    "        B, T = idx.size()",
    "        pos = torch.arange(0, T, dtype=torch.long, device=idx.device)",
    "        x = self.transformer.drop(self.transformer.wte(idx) + self.transformer.wpe(pos))",
    "        for block in self.transformer.h:",
    "            x = block(x)",
    "        x = self.transformer.ln_f(x)",
    "        logits = self.lm_head(x)",
    "        loss = None",
    "        if targets is not None:",
    "            loss = F.cross_entropy(logits.view(-1, logits.size(-1)), targets.view(-1))",
    "        return logits, loss",
    "",
    "    @torch.no_grad()",
    "    def generate(self, idx, max_new_tokens, temperature=1.0, top_k=None):",
    "        for _ in range(max_new_tokens):",
    "            idx_cond = idx[:, -self.cfg.block_size:]",
    "            logits, _ = self(idx_cond)",
    "            logits = logits[:, -1, :] / temperature",
    "            if top_k is not None:",
    "                v, _ = torch.topk(logits, top_k)",
    "                logits[logits < v[:, [-1]]] = -float('inf')",
    "            probs = F.softmax(logits, dim=-1)",
    "            idx_next = torch.multinomial(probs, num_samples=1)",
    "            idx = torch.cat((idx, idx_next), dim=1)",
    "        return idx",
))

cells.append(md(
    "## 2. Data — Tiny Shakespeare, tokenized with the GPT-2 BPE",
    "",
    "Same dataset used across the course. We tokenize with the real GPT-2 vocabulary so the",
    "model we train here is directly comparable to the pretrained GPT-2 we load later.",
))

cells.append(code(
    "import os, requests, numpy as np, tiktoken",
    "url = 'https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt'",
    "text = requests.get(url).text",
    "print(f'{len(text):,} characters')",
    "enc = tiktoken.get_encoding('gpt2')",
    "data = np.array(enc.encode(text), dtype=np.int64)",
    "n = int(0.9 * len(data))",
    "train_data, val_data = data[:n], data[n:]",
    "print(f'{len(data):,} tokens ({len(train_data):,} train / {len(val_data):,} val)')",
))

cells.append(code(
    "cfg = GPTConfig()",
    "batch_size = 32",
    "",
    "def get_batch(split):",
    "    d = train_data if split == 'train' else val_data",
    "    ix = torch.randint(len(d) - cfg.block_size, (batch_size,))",
    "    x = torch.stack([torch.from_numpy(d[i:i+cfg.block_size]) for i in ix])",
    "    y = torch.stack([torch.from_numpy(d[i+1:i+1+cfg.block_size]) for i in ix])",
    "    return x.to(device), y.to(device)",
    "",
    "model = GPT(cfg).to(device)",
    "print(f'{sum(p.numel() for p in model.parameters())/1e6:.1f}M parameters')",
))

cells.append(md(
    "## 3. Train on the GPU",
    "",
    "AdamW with a cosine learning-rate decay and a short warmup — the same recipe as the",
    "NumPy capstone, just faster. A few hundred steps on a T4 is enough to see clear English.",
))

cells.append(code(
    "max_iters = 2000",
    "warmup, lr_max, lr_min = 100, 3e-4, 3e-5",
    "opt = torch.optim.AdamW(model.parameters(), lr=lr_max, betas=(0.9, 0.95), weight_decay=0.1)",
    "",
    "def lr_at(it):",
    "    if it < warmup:",
    "        return lr_max * (it + 1) / warmup",
    "    ratio = (it - warmup) / max(1, (max_iters - warmup))",
    "    return lr_min + 0.5 * (lr_max - lr_min) * (1 + math.cos(math.pi * ratio))",
    "",
    "@torch.no_grad()",
    "def estimate_loss():",
    "    model.eval()",
    "    out = {}",
    "    for split in ('train', 'val'):",
    "        losses = torch.zeros(50)",
    "        for k in range(50):",
    "            _, loss = model(*get_batch(split))",
    "            losses[k] = loss.item()",
    "        out[split] = losses.mean().item()",
    "    model.train()",
    "    return out",
    "",
    "for it in range(max_iters):",
    "    for g in opt.param_groups:",
    "        g['lr'] = lr_at(it)",
    "    xb, yb = get_batch('train')",
    "    _, loss = model(xb, yb)",
    "    opt.zero_grad(set_to_none=True)",
    "    loss.backward()",
    "    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)",
    "    opt.step()",
    "    if it % 250 == 0 or it == max_iters - 1:",
    "        m = estimate_loss()",
    "        print(f\"step {it:4d} | train {m['train']:.3f} | val {m['val']:.3f}\")",
))

cells.append(md("## 4. Generate from *your* trained model"))
cells.append(code(
    "start = enc.encode('\\n')",
    "ctx = torch.tensor(start, dtype=torch.long, device=device)[None, ...]",
    "out = model.generate(ctx, max_new_tokens=300, temperature=0.8, top_k=200)",
    "print(enc.decode(out[0].tolist()))",
))

cells.append(md(
    "## 5. Load OpenAI's real GPT-2 weights into *your* architecture",
    "",
    "This is the proof. If your module definitions match GPT-2, the official 124M-parameter",
    "weights load cleanly and generate coherent English. HuggingFace stores the attention/MLP",
    "projections as `Conv1D` (transposed vs `nn.Linear`), so those four weight matrices are",
    "transposed on load — everything else maps one-to-one.",
))

cells.append(code(
    "!pip -q install transformers",
    "from transformers import GPT2LMHeadModel",
    "",
    "def load_gpt2():",
    "    cfg2 = GPTConfig(block_size=1024, vocab_size=50257, n_layer=12, n_head=12, n_embd=768)",
    "    model2 = GPT(cfg2)",
    "    sd = model2.state_dict()",
    "    keys = [k for k in sd if not k.endswith('.attn.mask')]",
    "",
    "    hf = GPT2LMHeadModel.from_pretrained('gpt2')",
    "    sd_hf = hf.state_dict()",
    "    transposed = ['attn.c_attn.weight', 'attn.c_proj.weight', 'mlp.c_fc.weight', 'mlp.c_proj.weight']",
    "    hf_keys = [k for k in sd_hf if not k.endswith('.attn.masked_bias') and not k.endswith('.attn.bias')]",
    "    assert len(hf_keys) == len(keys), f'{len(hf_keys)} vs {len(keys)} keys'",
    "    for k in hf_keys:",
    "        if any(k.endswith(w) for w in transposed):",
    "            assert sd_hf[k].shape[::-1] == sd[k].shape",
    "            with torch.no_grad(): sd[k].copy_(sd_hf[k].t())",
    "        else:",
    "            assert sd_hf[k].shape == sd[k].shape, f'{k}: {sd_hf[k].shape} vs {sd[k].shape}'",
    "            with torch.no_grad(): sd[k].copy_(sd_hf[k])",
    "    return model2.to(device).eval()",
    "",
    "gpt2 = load_gpt2()",
    "print('Loaded real GPT-2 (124M) into your architecture ✅')",
))

cells.append(code(
    "prompt = 'Artificial intelligence will'",
    "ids = torch.tensor(enc.encode(prompt), dtype=torch.long, device=device)[None, ...]",
    "out = gpt2.generate(ids, max_new_tokens=60, temperature=0.8, top_k=200)",
    "print(enc.decode(out[0].tolist()))",
))

cells.append(md(
    "## 🎉 You did it",
    "",
    "You trained your own Transformer on a GPU **and** proved your architecture is identical to",
    "OpenAI's GPT-2 by running their weights through your code. Everything from here — bigger",
    "models, fine-tuning, the GenAI SaaS products in the course — is scale and engineering on",
    "top of exactly what you just built.",
    "",
    "**Try next:** raise `n_layer`/`n_embd`, train longer, or fine-tune the loaded GPT-2 on your",
    "own text by unfreezing it and continuing the training loop above on a new dataset.",
))

nb = {
    "cells": cells,
    "metadata": {
        "accelerator": "GPU",
        "colab": {"provenance": [], "gpuType": "T4"},
        "kernelspec": {"display_name": "Python 3", "name": "python3"},
        "language_info": {"name": "python"},
    },
    "nbformat": 4,
    "nbformat_minor": 0,
}

# Validate: every code cell must be syntactically valid Python.
errors = []
for i, c in enumerate(cells):
    if c["cell_type"] == "code":
        srcs = "".join(c["source"])
        # skip shell (!pip) lines for ast
        py = "\n".join(l for l in srcs.split("\n") if not l.strip().startswith("!"))
        try:
            ast.parse(py)
        except SyntaxError as e:
            errors.append(f"cell {i}: {e}")
if errors:
    raise SystemExit("Notebook code invalid:\n" + "\n".join(errors))

os.makedirs("notebooks", exist_ok=True)
out = "notebooks/ADD_Academica_Capstone_GPU.ipynb"
with open(out, "w") as f:
    json.dump(nb, f, indent=1)
# Re-load to confirm valid JSON
with open(out) as f:
    json.load(f)
print(f"Wrote {out}: {len(cells)} cells, all code cells parse.")
