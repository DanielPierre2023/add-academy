/**
 * W2.5 — kill the "click the longest answer" exploit.
 *
 * DIAGNOSIS (run `node scripts/quiz-distractors.mjs`):
 *   Across all 307 questions, picking the single longest option hits a correct
 *   answer 92.2% of the time, because the content generator wrote correct
 *   answers as detailed, qualified sentences and distractors as terse phrases.
 *
 * FIX STRATEGY (no semantic change to which answer is correct):
 *   For each question we rewrite the OPTION STRINGS so that (a) length no longer
 *   predicts correctness — the correct option is never the unique longest — and
 *   (b) distractors remain plausible misconceptions, not throwaways. Option
 *   ORDER and the `correct` indices are preserved, so scoring is untouched.
 *
 * This file carries the curated rewrites for the foundational batch
 * (lectures 0–2, tri-lingual). Run with --write to apply, without to dry-run
 * and print the current pick-longest rate. The same script re-verifies after
 * writing, so remaining stages can be added to REWRITES and checked the same way.
 */
import fs from 'fs';
import path from 'path';

const DIR = 'src/content/quizzes';
const LANGS = ['en', 'ro', 'el'];

// file -> qIndex -> { en:[opts], ro:[opts], el:[opts] }. Only listed questions
// are touched; option counts must match the originals.
const REWRITES = {
  '0': {
    1: {
      en: [
        'The browser sandbox runs real model-training jobs much faster than any local Python setup',
        'The sandbox is instant for concepts; real Python is needed for GPU work and deploys',
        'Local Python cannot import numpy or the other core scientific libraries',
        'The browser sandbox can execute PyTorch and CUDA GPU kernels natively in-tab',
      ],
      ro: [
        'Sandbox-ul din browser rulează antrenarea reală a modelelor mai rapid decât Python local',
        'Sandbox-ul e instant pentru concepte; Python real e necesar pentru GPU și deploy',
        'Python-ul local nu poate importa numpy sau celelalte biblioteci științifice',
        'Sandbox-ul din browser poate executa nuclee GPU PyTorch și CUDA nativ în filă',
      ],
      el: [
        'Το sandbox του browser τρέχει την πραγματική εκπαίδευση μοντέλων πιο γρήγορα από τοπική Python',
        'Το sandbox είναι άμεσο για έννοιες· η πραγματική Python χρειάζεται για GPU και deploy',
        'Η τοπική Python δεν μπορεί να εισάγει numpy ή τις άλλες επιστημονικές βιβλιοθήκες',
        'Το sandbox του browser εκτελεί πυρήνες GPU PyTorch και CUDA εγγενώς στην καρτέλα',
      ],
    },
    3: {
      en: [
        '.env holding secret API keys',
        'requirements.txt, the pinned dependency list that belongs in version control',
        'checkpoints/*.pt binary model weights',
        'data/ holding large training datasets',
      ],
      ro: [
        '.env care conține chei API secrete',
        'requirements.txt, lista de dependențe fixate care trebuie versionată',
        'checkpoints/*.pt greutăți binare ale modelului',
        'data/ care conține seturi mari de antrenament',
      ],
      el: [
        '.env που κρατά μυστικά κλειδιά API',
        'requirements.txt, η λίστα εξαρτήσεων που ανήκει στο version control',
        'checkpoints/*.pt δυαδικά βάρη μοντέλου',
        'data/ που κρατά μεγάλα σύνολα εκπαίδευσης',
      ],
    },
    4: {
      en: [
        'A social media bot, speech-to-text tool, video editor, game AI, and email writer',
        'Database manager, file converter, web scraper, email client, and a calculator',
        'Image generation, video generation, text rewriting, AI-text detection, and OCR',
        'Search engine, recommender, fraud detector, sentiment analyzer, and spam filter',
      ],
      ro: [
        'Un bot social, unealtă speech-to-text, editor video, AI de joc și scriitor de emailuri',
        'Manager de baze de date, convertor fișiere, web scraper, client email și calculator',
        'Generare imagini, generare video, rescriere text, detecție text-AI și OCR',
        'Motor căutare, recomandări, detector fraudă, analiză sentiment și filtru spam',
      ],
      el: [
        'Ένα social bot, εργαλείο speech-to-text, video editor, AI παιχνιδιού και συγγραφέας email',
        'Διαχειριστής βάσης, μετατροπέας αρχείων, web scraper, πελάτης email και αριθμομηχανή',
        'Δημιουργία εικόνας, δημιουργία βίντεο, αναδιατύπωση κειμένου, ανίχνευση AI-κειμένου και OCR',
        'Μηχανή αναζήτησης, συστάσεις, ανιχνευτής απάτης, ανάλυση συναισθήματος και φίλτρο spam',
      ],
    },
  },
  '1': {
    0: {
      en: [
        "That's correct — LLMs understand language exactly the way the human brain does",
        'LLMs predict statistically likely next words from patterns in huge text data',
        'LLMs look up answers in a giant stored database of questions and responses',
        'LLMs follow hand-written rules programmers wrote for every possible question',
      ],
      ro: [
        'Corect — LLM-urile înțeleg limbajul exact cum o face creierul uman',
        'LLM-urile prezic statistic cuvintele următoare din tipare în text masiv',
        'LLM-urile caută răspunsuri într-o bază uriașă de întrebări și răspunsuri',
        'LLM-urile urmează reguli scrise manual pentru fiecare întrebare posibilă',
      ],
      el: [
        'Σωστό — τα LLM κατανοούν τη γλώσσα ακριβώς όπως ο ανθρώπινος εγκέφαλος',
        'Τα LLM προβλέπουν στατιστικά τις επόμενες λέξεις από μοτίβα σε τεράστια κείμενα',
        'Τα LLM αναζητούν απαντήσεις σε μια τεράστια βάση ερωτήσεων και απαντήσεων',
        'Τα LLM ακολουθούν χειρόγραφους κανόνες για κάθε πιθανή ερώτηση',
      ],
    },
    1: {
      en: [
        'Each parameter stores one specific fact, like a single spreadsheet cell does',
        "The model's knowledge is split evenly across many different physical servers",
        'No single parameter holds a fact; billions act together to produce meaning',
        'The model distributes its generated answers to many users simultaneously now',
      ],
      ro: [
        'Fiecare parametru stochează un fapt specific, ca o celulă dintr-un tabel',
        'Cunoașterea modelului e împărțită egal pe multe servere fizice diferite',
        'Niciun parametru nu ține un fapt; miliarde lucrează împreună pentru sens',
        'Modelul își distribuie răspunsurile generate către mulți utilizatori simultan',
      ],
      el: [
        'Κάθε παράμετρος αποθηκεύει ένα συγκεκριμένο γεγονός, σαν κελί λογιστικού φύλλου',
        'Η γνώση του μοντέλου μοιράζεται ομοιόμορφα σε πολλούς διαφορετικούς διακομιστές',
        'Καμία μεμονωμένη παράμετρος δεν κρατά γεγονός· δισεκατομμύρια συνεργάζονται',
        'Το μοντέλο διανέμει τις απαντήσεις του σε πολλούς χρήστες ταυτόχρονα',
      ],
    },
    2: {
      en: [
        "It becomes more intelligent because children's books use clearer language",
        'It works identically to GPT-3 because the model architecture is unchanged',
        'It writes story-like text well but lacks science, code, and current events',
        'It becomes completely unable to generate any coherent text at all afterwards',
      ],
      ro: [
        'Devine mai inteligent pentru că poveștile pentru copii sunt mai clare',
        'Funcționează identic cu GPT-3 pentru că arhitectura este neschimbată',
        'Scrie bine text de tip poveste, dar nu știe știință, cod sau actualități',
        'Devine complet incapabil să genereze vreun text coerent după aceea',
      ],
      el: [
        'Γίνεται πιο έξυπνο επειδή τα παιδικά βιβλία χρησιμοποιούν πιο καθαρή γλώσσα',
        'Λειτουργεί ίδια με το GPT-3 επειδή η αρχιτεκτονική είναι αμετάβλητη',
        'Γράφει καλά κείμενο τύπου ιστορίας αλλά αγνοεί επιστήμη, κώδικα, επικαιρότητα',
        'Γίνεται εντελώς ανίκανο να παραγάγει οποιοδήποτε συνεκτικό κείμενο',
      ],
    },
    3: {
      en: [
        'Understanding internals helps you diagnose why a model behaves unexpectedly',
        'Building from scratch guarantees your model will outperform GPT-4 on every task',
        'Core ideas like tokenization and attention stay stable even as tools change',
        'Companies increasingly want private, specialized models tuned to their own data',
      ],
      ro: [
        'Înțelegerea interiorului ajută la diagnosticarea comportamentului neașteptat',
        'Construirea de la zero garantează că modelul va depăși GPT-4 la orice sarcină',
        'Ideile de bază precum tokenizarea și atenția rămân stabile chiar când uneltele se schimbă',
        'Companiile vor tot mai mult modele private, specializate, adaptate datelor lor',
      ],
      el: [
        'Η κατανόηση του εσωτερικού βοηθά να διαγνώσεις γιατί ένα μοντέλο συμπεριφέρεται παράξενα',
        'Η κατασκευή από το μηδέν εγγυάται ότι το μοντέλο θα ξεπεράσει το GPT-4 παντού',
        'Βασικές ιδέες όπως tokenization και attention μένουν σταθερές ακόμη κι όταν αλλάζουν τα εργαλεία',
        'Οι εταιρείες θέλουν όλο και πιο ιδιωτικά, εξειδικευμένα μοντέλα στα δικά τους δεδομένα',
      ],
    },
    4: {
      en: [
        'The calculator simply draws more electrical power than the language model does',
        "The calculator runs an explicit rule; the LLM predicts '4' as most likely",
        'There is no real difference — both rely on exactly the same underlying maths',
        'The LLM is always strictly more accurate than a traditional calculator app is',
      ],
      ro: [
        'Calculatorul consumă pur și simplu mai mult curent decât modelul lingvistic',
        "Calculatorul rulează o regulă explicită; LLM-ul prezice '4' ca fiind cel mai probabil",
        'Nu există nicio diferență reală — ambele folosesc exact aceeași matematică',
        'LLM-ul este întotdeauna strict mai precis decât o aplicație de calculator',
      ],
      el: [
        'Το κομπιουτεράκι απλώς καταναλώνει περισσότερο ρεύμα από το γλωσσικό μοντέλο',
        "Το κομπιουτεράκι τρέχει ρητό κανόνα· το LLM προβλέπει '4' ως πιο πιθανό",
        'Δεν υπάρχει πραγματική διαφορά — και τα δύο βασίζονται στα ίδια μαθηματικά',
        'Το LLM είναι πάντα αυστηρά πιο ακριβές από μια εφαρμογή αριθμομηχανής',
      ],
    },
  },
  '2': {
    0: {
      en: [
        'Prediction → Embedding → Tokenization → Transformer layers → Output stage',
        'Tokenization → Embedding → Transformer layers → Prediction → Output',
        'Embedding → Tokenization → Prediction → Transformer → Output stage',
        'Transformer → Tokenization → Embedding → Output → Prediction step',
      ],
      ro: [
        'Predicție → Embedding → Tokenizare → Straturi Transformer → Etapa de ieșire',
        'Tokenizare → Embedding → Straturi Transformer → Predicție → Ieșire',
        'Embedding → Tokenizare → Predicție → Transformer → Etapa de ieșire',
        'Transformer → Tokenizare → Embedding → Ieșire → Pasul de predicție',
      ],
      el: [
        'Πρόβλεψη → Embedding → Tokenization → Στρώματα Transformer → Στάδιο εξόδου',
        'Tokenization → Embedding → Στρώματα Transformer → Πρόβλεψη → Έξοδος',
        'Embedding → Tokenization → Πρόβλεψη → Transformer → Στάδιο εξόδου',
        'Transformer → Tokenization → Embedding → Έξοδος → Βήμα πρόβλεψης',
      ],
    },
    1: {
      en: [
        'Transformers process all tokens in parallel, making training much faster',
        'Transformers need much smaller datasets and far fewer parameters than RNNs',
        'Attention lets any word relate directly to any other, regardless of distance',
        'Transformers completely eliminated the need for any training data whatsoever now',
      ],
      ro: [
        'Transformerele procesează toate tokenurile în paralel, accelerând antrenarea',
        'Transformerele au nevoie de seturi mult mai mici și mai puțini parametri decât RNN',
        'Atenția permite oricărui cuvânt să se lege direct de altul, indiferent de distanță',
        'Transformerele au eliminat complet nevoia de orice date de antrenament acum',
      ],
      el: [
        'Τα Transformers επεξεργάζονται όλα τα tokens παράλληλα, επιταχύνοντας την εκπαίδευση',
        'Τα Transformers χρειάζονται πολύ μικρότερα σύνολα και λιγότερες παραμέτρους από RNN',
        'Το attention επιτρέπει σε κάθε λέξη να συνδέεται άμεσα με άλλη, ανεξαρτήτως απόστασης',
        'Τα Transformers εξάλειψαν εντελώς την ανάγκη για οποιαδήποτε δεδομένα εκπαίδευσης',
      ],
    },
    2: {
      en: [
        'It is AI but does not count as Machine Learning in any meaningful way here',
        "It's AI, ML, Deep Learning, Generative AI, and an LLM — all five at once",
        'It is only Generative AI and is unrelated to Machine Learning entirely',
        'It is Deep Learning but is not a form of Generative AI at all, really',
      ],
      ro: [
        'Este AI, dar nu se califică drept Machine Learning în niciun sens real aici',
        'Este AI, ML, Deep Learning, Generative AI și un LLM — toate cinci deodată',
        'Este doar Generative AI și nu are legătură cu Machine Learning deloc',
        'Este Deep Learning, dar nu este o formă de Generative AI deloc, de fapt',
      ],
      el: [
        'Είναι AI αλλά δεν μετρά ως Machine Learning με κανέναν ουσιαστικό τρόπο εδώ',
        'Είναι AI, ML, Deep Learning, Generative AI και LLM — και τα πέντε μαζί',
        'Είναι μόνο Generative AI και δεν σχετίζεται καθόλου με το Machine Learning',
        'Είναι Deep Learning αλλά δεν είναι μορφή Generative AI καθόλου, στην ουσία',
      ],
    },
    3: {
      en: [
        'They are deliberately programmed to lie from time to time to test their users',
        'They rely on a faulty internal database that happens to store wrong facts',
        'They optimize for fluent, probable text, not facts, filling gaps with invention',
        'Their live internet connection drops, so they simply cannot verify facts in time',
      ],
      ro: [
        'Sunt programate intenționat să mintă din când în când pentru a testa utilizatorii',
        'Se bazează pe o bază internă defectuoasă care stochează fapte greșite',
        'Optimizează pentru text fluent și probabil, nu pentru fapte, umplând golurile inventând',
        'Conexiunea lor la internet cade, deci pur și simplu nu pot verifica faptele la timp',
      ],
      el: [
        'Είναι σκόπιμα προγραμματισμένα να λένε ψέματα πού και πού για να δοκιμάζουν χρήστες',
        'Βασίζονται σε μια ελαττωματική εσωτερική βάση που αποθηκεύει λάθος γεγονότα',
        'Βελτιστοποιούν για ρέον, πιθανό κείμενο, όχι γεγονότα, γεμίζοντας κενά με επινοήσεις',
        'Η σύνδεσή τους στο ίντερνετ πέφτει, οπότε δεν μπορούν να επαληθεύσουν γεγονότα εγκαίρως',
      ],
    },
    4: {
      en: [
        'Decoder-only models are always strictly smaller and faster than encoder models',
        'Decoder-only models can understand AND generate; encoder-only only understand',
        'Encoder-only models cannot process any input text whatsoever, at all, ever',
        'Decoder-only models require no training data of any kind in order to work',
      ],
      ro: [
        'Modelele decoder-only sunt întotdeauna strict mai mici și mai rapide decât encoder',
        'Modelele decoder-only pot înțelege ȘI genera; encoder-only doar înțeleg',
        'Modelele encoder-only nu pot procesa niciun text de intrare, deloc, niciodată',
        'Modelele decoder-only nu au nevoie de niciun fel de date de antrenament ca să funcționeze',
      ],
      el: [
        'Τα decoder-only είναι πάντα αυστηρά μικρότερα και ταχύτερα από τα encoder',
        'Τα decoder-only καταλαβαίνουν ΚΑΙ παράγουν· τα encoder-only μόνο καταλαβαίνουν',
        'Τα encoder-only δεν μπορούν να επεξεργαστούν κανένα κείμενο εισόδου, καθόλου, ποτέ',
        'Τα decoder-only δεν χρειάζονται κανενός είδους δεδομένα εκπαίδευσης για να δουλέψουν',
      ],
    },
  },
};

function longestIsCorrect(q) {
  if (!q.options || !q.options.length) return null;
  const lens = q.options.map((o) => o.length);
  const max = Math.max(...lens);
  const pick = lens.indexOf(max);
  return (q.correct || []).includes(pick);
}

function auditAll() {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'));
  let total = 0,
    hits = 0;
  for (const f of files) {
    const d = JSON.parse(fs.readFileSync(path.join(DIR, f)));
    for (const q of d.en?.questions || []) {
      total++;
      if (longestIsCorrect(q)) hits++;
    }
  }
  return { total, hits, pct: total ? (100 * hits) / total : 0 };
}

function apply() {
  let touched = 0;
  const problems = [];
  for (const [file, qs] of Object.entries(REWRITES)) {
    const p = path.join(DIR, `${file}.json`);
    const d = JSON.parse(fs.readFileSync(p));
    for (const [qIdxStr, langs] of Object.entries(qs)) {
      const qIdx = Number(qIdxStr);
      for (const lang of LANGS) {
        const q = d[lang]?.questions?.[qIdx];
        const opts = langs[lang];
        if (!q || !opts) {
          problems.push(`${file}.${lang}.q${qIdx}: missing question or options`);
          continue;
        }
        if (opts.length !== q.options.length) {
          problems.push(
            `${file}.${lang}.q${qIdx}: option count ${opts.length} != ${q.options.length}`
          );
          continue;
        }
        q.options = opts.slice();
        // verify the length tell is broken for this question (english is the metric)
      }
      touched++;
    }
    fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
  }
  return { touched, problems };
}

function verifyBatch() {
  const rows = [];
  for (const file of Object.keys(REWRITES)) {
    const d = JSON.parse(fs.readFileSync(path.join(DIR, `${file}.json`)));
    for (const qIdxStr of Object.keys(REWRITES[file])) {
      const q = d.en.questions[Number(qIdxStr)];
      rows.push({ q: `${file}.q${qIdxStr}`, longestIsCorrect: longestIsCorrect(q) });
    }
  }
  return rows;
}

const write = process.argv.includes('--write');
const before = auditAll();
console.log(`BEFORE: pick-longest hits correct ${before.hits}/${before.total} = ${before.pct.toFixed(1)}%`);

if (write) {
  const { touched, problems } = apply();
  if (problems.length) {
    console.error('PROBLEMS:\n  ' + problems.join('\n  '));
    process.exit(1);
  }
  const after = auditAll();
  console.log(`APPLIED: ${touched} questions rewritten (lectures ${Object.keys(REWRITES).join(', ')})`);
  console.log(`AFTER : pick-longest hits correct ${after.hits}/${after.total} = ${after.pct.toFixed(1)}%`);
  const batch = verifyBatch();
  const stillBiased = batch.filter((r) => r.longestIsCorrect);
  console.log(`BATCH rewritten: ${batch.length} questions; still length-biased: ${stillBiased.length}`);
  if (stillBiased.length) console.log('  ->', stillBiased.map((r) => r.q).join(', '));
} else {
  console.log('(dry run — pass --write to apply the foundational batch)');
}
