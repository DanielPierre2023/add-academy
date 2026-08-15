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
        'Ένα social bot, εργαλείο speech-to-text, video editor, AI παιχνιδιού και γεννήτρια email κειμένων',
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
        'Τα LLM αναζητούν απαντήσεις σε μια τεράστια αποθηκευμένη βάση ερωτήσεων και απαντήσεων',
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
        'Devine mai inteligent pentru că poveștile pentru copii sunt mult mai clare și mai simple',
        'Funcționează identic cu GPT-3 pentru că arhitectura este neschimbată',
        'Scrie bine text de tip poveste, dar nu știe știință, cod sau actualități',
        'Devine complet incapabil să genereze vreun text coerent după aceea',
      ],
      el: [
        'Γίνεται πιο έξυπνο επειδή τα παιδικά βιβλία χρησιμοποιούν πολύ πιο καθαρή και απλή γλώσσα',
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
        'Construirea de la zero garantează că modelul tău va depăși GPT-4 la absolut orice sarcină dată',
        'Ideile de bază precum tokenizarea și atenția rămân stabile chiar când uneltele se schimbă',
        'Companiile vor tot mai mult modele private, specializate, adaptate datelor lor',
      ],
      el: [
        'Η κατανόηση του εσωτερικού βοηθά να διαγνώσεις γιατί ένα μοντέλο συμπεριφέρεται παράξενα',
        'Η κατασκευή από το μηδέν εγγυάται ότι το μοντέλο σου θα ξεπεράσει το GPT-4 σε απολύτως κάθε εργασία',
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
        'Calculatorul consumă pur și simplu mult mai mult curent electric decât modelul lingvistic mare',
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
        'Τα Transformers χρειάζονται πολύ μικρότερα σύνολα δεδομένων και λιγότερες παραμέτρους από τα RNN',
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
        'Conexiunea lor la internet cade mereu, deci pur și simplu nu pot verifica faptele la timp deloc',
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
  '3': {
    0: {
      en: [
        "Pretrain a brand-new LLM completely from scratch so it is perfectly and fully tailored to their exact needs",
        "Finetune an existing pretrained model on their support data — affordable and reuses language skills",
        "Hand-code explicit if-then rules for every possible customer question",
        "Ship the raw pretrained base model as-is, with no finetuning",
      ],
      ro: [
        "Antrenează de la zero un LLM complet nou, perfect și integral adaptat exact la nevoile lor specifice",
        "Ajustează un model preantrenat pe datele lor de suport — ieftin și refolosește abilități",
        "Scrie reguli explicite if-then pentru fiecare întrebare posibilă a clienților",
        "Livrează modelul preantrenat brut ca atare, fără finetuning",
      ],
      el: [
        "Εκπαίδευσε από το μηδέν ένα ολοκαίνουριο LLM ώστε να ταιριάζει απόλυτα και πλήρως στις ακριβείς ανάγκες τους",
        "Κάνε finetune ένα προεκπαιδευμένο μοντέλο στα δεδομένα τους — φθηνό, επαναχρησιμοποιεί δεξιότητες",
        "Γράψε ρητούς κανόνες if-then για κάθε πιθανή ερώτηση πελάτη",
        "Δώσε το ωμό προεκπαιδευμένο μοντέλο ως έχει, χωρίς finetuning",
      ],
    },
    1: {
      en: [
        "Because it needs to hire thousands of paid human labelers to hand-tag every single training example first",
        "The text itself is the label — hide a word, predict it — so training data is effectively unlimited",
        "Because it only works on very small, carefully curated datasets",
        "Because it removes the need for any computing resources at all",
      ],
      ro: [
        "Pentru că necesită mii de etichetatori umani plătiți care să eticheteze manual fiecare exemplu întâi",
        "Textul însuși e eticheta — ascunzi un cuvânt, îl prezici — deci datele sunt practic nelimitate",
        "Pentru că funcționează doar pe seturi de date foarte mici și atent selectate",
        "Pentru că elimină complet nevoia de resurse de calcul",
      ],
      el: [
        "Επειδή απαιτεί χιλιάδες πληρωμένους ανθρώπινους annotators να ετικετάρουν κάθε παράδειγμα πρώτα",
        "Το ίδιο το κείμενο είναι η ετικέτα — κρύβεις μια λέξη, την προβλέπεις — άρα άπειρα δεδομένα",
        "Επειδή δουλεύει μόνο σε πολύ μικρά, προσεκτικά επιλεγμένα σύνολα δεδομένων",
        "Επειδή εξαλείφει εντελώς την ανάγκη για υπολογιστικούς πόρους",
      ],
    },
    2: {
      en: [
        "It answers 'Paris' clearly and helpfully, exactly like the polished ChatGPT assistant you know and use",
        "It crashes and returns an error because the input happens to be a question",
        "It may keep listing more questions ('...of Germany?') — it completes patterns, not instructions",
        "It refuses to answer because built-in safety filters block the question",
      ],
      ro: [
        "Răspunde 'Paris' clar și util, exact ca asistentul șlefuit ChatGPT pe care îl știi și folosești",
        "Se blochează și dă eroare pentru că intrarea este o întrebare",
        "Poate continua cu alte întrebări ('...Germaniei?') — completează tipare, nu instrucțiuni",
        "Refuză să răspundă pentru că filtrele de siguranță blochează întrebarea",
      ],
      el: [
        "Απαντά 'Παρίσι' καθαρά και χρήσιμα, ακριβώς όπως ο γυαλισμένος βοηθός ChatGPT που ήδη ξέρεις και χρησιμοποιείς",
        "Καταρρέει και επιστρέφει σφάλμα επειδή η είσοδος τυχαίνει να είναι ερώτηση",
        "Μπορεί να συνεχίσει με κι άλλες ερωτήσεις ('...Γερμανίας;') — συμπληρώνει μοτίβα, όχι εντολές",
        "Αρνείται να απαντήσει επειδή τα φίλτρα ασφαλείας μπλοκάρουν την ερώτηση",
      ],
    },
    3: {
      en: [
        "It freezes the original weights and trains only a small set of new parameters (under 1%)",
        "It makes the resulting model significantly larger and far more powerful than the original base model",
        "It lets individuals and small teams finetune large models on ordinary consumer hardware",
        "It fully replaces the pretrained model with an entirely new one",
      ],
      ro: [
        "Îngheață greutățile originale și antrenează doar un set mic de parametri noi (sub 1%)",
        "Face modelul rezultat semnificativ mai mare și mult mai puternic decât modelul de bază original",
        "Permite indivizilor și echipelor mici să ajusteze modele mari pe hardware obișnuit de consum",
        "Înlocuiește complet modelul preantrenat cu unul complet nou",
      ],
      el: [
        "Παγώνει τα αρχικά βάρη και εκπαιδεύει μόνο ένα μικρό σύνολο νέων παραμέτρων (κάτω από 1%)",
        "Κάνει το τελικό μοντέλο σημαντικά μεγαλύτερο και πολύ πιο ισχυρό από ό,τι είναι το αρχικό βασικό μοντέλο",
        "Επιτρέπει σε άτομα και μικρές ομάδες να κάνουν finetune μεγάλα μοντέλα σε συνηθισμένο hardware",
        "Αντικαθιστά πλήρως το προεκπαιδευμένο μοντέλο με ένα εντελώς νέο",
      ],
    },
    4: {
      en: [
        "Only vocabulary — merely that the word 'umbrella' happens to exist in the language",
        "Only grammar — purely the correct part of speech that must grammatically follow the word 'her'",
        "Cause and effect — that rain makes people grab umbrellas — plus grammar and common sense",
        "Nothing useful at all, since one single example can never teach a model anything",
      ],
      ro: [
        "Doar vocabular — pur și simplu că cuvântul 'umbrelă' există în limbă",
        "Doar gramatică — exact partea de vorbire care trebuie gramatical să urmeze după cuvântul potrivit",
        "Cauză și efect — că ploaia îi face pe oameni să ia umbrele — plus gramatică și bun-simț",
        "Nimic util, pentru că un singur exemplu nu poate învăța niciodată un model",
      ],
      el: [
        "Μόνο λεξιλόγιο — απλώς ότι η λέξη 'ομπρέλα' τυχαίνει να υπάρχει στη γλώσσα",
        "Μόνο γραμματική — ακριβώς και μόνο το μέρος του λόγου που πρέπει γραμματικά να ακολουθεί τη λέξη αυτή",
        "Αιτία και αποτέλεσμα — ότι η βροχή κάνει τους ανθρώπους να παίρνουν ομπρέλες — και κοινή λογική",
        "Τίποτα χρήσιμο, αφού ένα μόνο παράδειγμα δεν διδάσκει ποτέ ένα μοντέλο",
      ],
    },
  },
  '4': {
    0: {
      en: [
        "It follows a fixed grammar rule that pronouns always refer to the first noun in the whole sentence",
        "It just randomly assigns its attention to whichever words happen to be nearby",
        "The model learned 'tired' is an animate trait, so 'it' attends strongly to 'cat', not 'mat'",
        "It looks the answer up in a built-in pronoun-resolution database of examples",
      ],
      ro: [
        "Urmează o regulă fixă că pronumele se referă mereu la primul substantiv din întreaga propoziție",
        "Pur și simplu atribuie atenția aleatoriu cuvintelor care se află în apropiere",
        "Modelul a învățat că 'obosit' e o trăsătură animată, deci 'it' se leagă de 'cat', nu 'mat'",
        "Caută răspunsul într-o bază de date încorporată de rezolvare a pronumelor",
      ],
      el: [
        "Ακολουθεί σταθερό κανόνα ότι οι αντωνυμίες αναφέρονται πάντα στο πρώτο ουσιαστικό όλης της πρότασης",
        "Απλώς αναθέτει την προσοχή τυχαία σε όποιες λέξεις τυχαίνει να είναι κοντά",
        "Το μοντέλο έμαθε ότι το 'κουρασμένο' είναι έμψυχο, άρα το 'it' δείχνει στο 'cat', όχι 'mat'",
        "Ψάχνει την απάντηση σε ενσωματωμένη βάση δεδομένων επίλυσης αντωνυμιών",
      ],
    },
    1: {
      en: [
        "It introduced a small, incremental improvement to the existing RNN architectures of the time",
        "It proved that carefully hand-written grammar rules are still the best approach for NLP tasks",
        "It showed attention alone, without recurrence, can process sequences in parallel — replacing RNNs",
        "It was, historically, the very first research paper ever written on the topic of artificial intelligence",
      ],
      ro: [
        "A introdus o îmbunătățire mică, incrementală, a arhitecturilor RNN existente la acea vreme",
        "A dovedit că regulile gramaticale scrise manual rămân cea mai bună abordare pentru NLP",
        "A arătat că atenția singură, fără recurență, procesează secvențe în paralel — înlocuind RNN",
        "A fost, istoric, prima lucrare de cercetare scrisă vreodată pe tema inteligenței artificiale întregi",
      ],
      el: [
        "Εισήγαγε μια μικρή, σταδιακή βελτίωση στις υπάρχουσες αρχιτεκτονικές RNN της εποχής",
        "Απέδειξε ότι οι χειρόγραφοι γραμματικοί κανόνες παραμένουν η καλύτερη προσέγγιση για NLP",
        "Έδειξε ότι η προσοχή μόνη, χωρίς αναδρομή, επεξεργάζεται ακολουθίες παράλληλα — αντικαθιστώντας RNN",
        "Ήταν ιστορικά η πρώτη ερευνητική εργασία που γράφτηκε ποτέ για το ευρύτερο θέμα της τεχνητής νοημοσύνης συνολικά",
      ],
    },
    2: {
      en: [
        "Q = the book's price, K = the book's weight on the shelf, and V = the book's cover color",
        "Q = your question, K = the book titles you scan, V = the actual contents you read",
        "Q = the librarian, K = your library membership card, V = the overdue late fees you owe",
        "Q, K, and V all represent exactly the same thing — just the word's meaning, nothing more",
      ],
      ro: [
        "Q = prețul cărții, K = greutatea cărții pe raft, iar V = culoarea copertei cărții",
        "Q = întrebarea ta, K = titlurile cărților pe care le scanezi, V = conținutul citit",
        "Q = bibliotecarul, K = cardul tău de membru, V = taxele de întârziere pe care le datorezi",
        "Q, K și V reprezintă exact același lucru — doar sensul cuvântului, nimic mai mult",
      ],
      el: [
        "Q = η τιμή του βιβλίου, K = το βάρος του στο ράφι, και V = το χρώμα του εξωφύλλου",
        "Q = η ερώτησή σου, K = οι τίτλοι που σαρώνεις, V = το πραγματικό περιεχόμενο που διαβάζεις",
        "Q = ο βιβλιοθηκάριος, K = η κάρτα μέλους της βιβλιοθήκης σου, V = τα πρόστιμα καθυστέρησης που χρωστάς",
        "Q, K και V αναπαριστούν ακριβώς το ίδιο πράγμα — μόνο τη σημασία της λέξης",
      ],
    },
    3: {
      en: [
        "A Transformer is an architecture (a blueprint); an LLM is a trained model built with it",
        "All modern LLMs use the Transformer architecture, but not all Transformers are LLMs",
        "A Transformer and an LLM are exactly the same thing, just two entirely different names for it",
        "A 10M-parameter Transformer trained for sentiment analysis is a Transformer but not an LLM",
      ],
      ro: [
        "Un Transformer e o arhitectură (un plan); un LLM e un model antrenat construit cu ea",
        "Toate LLM-urile moderne folosesc arhitectura Transformer, dar nu toate Transformerele sunt LLM",
        "Un Transformer și un LLM sunt exact același lucru, doar două nume complet diferite pentru exact același el",
        "Un Transformer de 10M parametri antrenat pentru sentiment e Transformer, dar nu LLM",
      ],
      el: [
        "Ένας Transformer είναι αρχιτεκτονική (σχέδιο)· ένα LLM είναι εκπαιδευμένο μοντέλο με αυτήν",
        "Όλα τα σύγχρονα LLM χρησιμοποιούν Transformer, αλλά δεν είναι όλοι οι Transformers LLM",
        "Ένας Transformer κι ένα LLM είναι ακριβώς το ίδιο πράγμα, απλώς δύο εντελώς διαφορετικά ονόματα",
        "Ένας Transformer 10Μ παραμέτρων για ανάλυση συναισθήματος είναι Transformer, όχι LLM",
      ],
    },
    4: {
      en: [
        "It mainly saves memory by cutting down on the number of computations performed",
        "During generation, future tokens don't exist yet, so each token uses only earlier ones",
        "It deliberately makes the model run slower for added safety during text generation",
        "Because letting it peek at future tokens would make the model far too accurate to be useful",
      ],
      ro: [
        "Economisește în principal memorie reducând numărul de calcule efectuate",
        "În timpul generării, tokenii viitori încă nu există, deci fiecare token îi folosește pe cei anteriori",
        "Face în mod deliberat modelul să ruleze mai lent pentru siguranță în timpul generării",
        "Pentru că a-i lăsa cumva să vadă tokenii viitori ar face modelul mult prea precis și puternic ca să fie util",
      ],
      el: [
        "Εξοικονομεί κυρίως μνήμη μειώνοντας τον αριθμό των υπολογισμών",
        "Κατά τη γένεση, τα μελλοντικά tokens δεν υπάρχουν ακόμη, οπότε κάθε token χρησιμοποιεί τα προηγούμενα",
        "Κάνει σκόπιμα το μοντέλο πιο αργό για επιπλέον ασφάλεια κατά τη γένεση",
        "Επειδή το να του επιτρέπαμε να βλέπει μελλοντικά tokens θα έκανε το μοντέλο υπερβολικά ακριβές για να είναι χρήσιμο",
      ],
    },
  },
  '5': {
    0: {
      en: [
        "The Transformer is a fundamentally poor architecture that needs constant redesign to keep working",
        "It scales remarkably — more size and data reliably give better results, no redesign needed",
        "Parameter count actually does not matter at all for a model's final quality or ability",
        "GPT-3 secretly uses a completely different architecture than the earlier GPT-1 did",
      ],
      ro: [
        "Transformer e o arhitectură fundamental slabă care are nevoie de reproiectare constantă ca să meargă",
        "Se scalează remarcabil — mai multă dimensiune și date dau rezultate mai bune, fără reproiectare",
        "Numărul de parametri chiar nu contează deloc pentru calitatea sau abilitatea finală a modelului",
        "GPT-3 folosește pe ascuns o arhitectură complet diferită de cea a GPT-1",
      ],
      el: [
        "Ο Transformer είναι θεμελιωδώς κακή αρχιτεκτονική που χρειάζεται συνεχή επανασχεδίαση για να δουλεύει",
        "Κλιμακώνεται εντυπωσιακά — περισσότερο μέγεθος και δεδομένα δίνουν καλύτερα αποτελέσματα",
        "Ο αριθμός παραμέτρων δεν έχει καμία απολύτως σημασία για την τελική ποιότητα του μοντέλου",
        "Το GPT-3 κρυφά χρησιμοποιεί εντελώς διαφορετική αρχιτεκτονική από το GPT-1",
      ],
    },
    1: {
      en: [
        "Temperature actually just controls the model's own internet connection and its access speed",
        "Low temperature picks the most probable token (factual); high temperature lets unlikely ones through",
        "High temperature makes the model far more factual, while low temperature actually makes it much more creative instead",
        "Temperature has no measurable effect whatsoever on the model's generated output text",
      ],
      ro: [
        "Temperatura controlează de fapt doar conexiunea la internet și viteza de acces a modelului însuși, atât",
        "Temperatura mică alege tokenul cel mai probabil (factual); cea mare lasă să treacă cele improbabile",
        "Temperatura mare face modelul mult mai factual, iar cea mică îl face mult mai creativ",
        "Temperatura nu are absolut niciun efect măsurabil asupra textului generat de model",
      ],
      el: [
        "Η θερμοκρασία στην ουσία ελέγχει μόνο τη σύνδεση στο ίντερνετ και την ταχύτητα του ίδιου του μοντέλου",
        "Χαμηλή θερμοκρασία διαλέγει το πιο πιθανό token (factual)· υψηλή αφήνει τα απίθανα να περάσουν",
        "Η υψηλή θερμοκρασία κάνει το μοντέλο πολύ πιο factual, ενώ η χαμηλή πολύ πιο δημιουργικό",
        "Η θερμοκρασία δεν έχει κανένα μετρήσιμο αποτέλεσμα στο παραγόμενο κείμενο",
      ],
    },
    2: {
      en: [
        "Few-shot learning means the model was originally trained on only a very small number of examples total",
        "The model learns a new task from a few examples in the prompt — no retraining needed at all",
        "Few-shot learning means the model can only answer a small number of questions each day",
        "Few-shot learning means the model quickly forgets everything after just a few uses",
      ],
      ro: [
        "Few-shot înseamnă că modelul a fost antrenat inițial pe doar un număr foarte mic de exemple în total",
        "Modelul învață o sarcină nouă din câteva exemple din prompt — fără reantrenare deloc",
        "Few-shot înseamnă că modelul poate răspunde doar la câteva întrebări în fiecare zi",
        "Few-shot înseamnă că modelul uită repede totul după doar câteva utilizări",
      ],
      el: [
        "Το few-shot σημαίνει ότι το μοντέλο εκπαιδεύτηκε αρχικά μόνο σε πολύ μικρό αριθμό παραδειγμάτων συνολικά",
        "Το μοντέλο μαθαίνει νέα εργασία από λίγα παραδείγματα στο prompt — χωρίς καμία επανεκπαίδευση",
        "Το few-shot σημαίνει ότι το μοντέλο απαντά μόνο σε λίγες ερωτήσεις κάθε μέρα",
        "Το few-shot σημαίνει ότι το μοντέλο ξεχνά γρήγορα τα πάντα μετά από λίγες χρήσεις",
      ],
    },
    3: {
      en: [
        "A huge whole-word vocabulary would be needed to cover all words, names, and misspellings",
        "Subword units let the model handle never-before-seen words by breaking them into known pieces",
        "Related words like 'run', 'running', 'runner' can share common subword components",
        "Whole-word tokenization is actually strictly better, but GPT chose BPE purely by mistake somehow",
      ],
      ro: [
        "Ar fi nevoie de un vocabular uriaș de cuvinte întregi pentru toate cuvintele, numele și greșelile",
        "Unitățile subword permit modelului să gestioneze cuvinte nevăzute descompunându-le în bucăți știute",
        "Cuvinte înrudite ca 'run', 'running', 'runner' pot împărtăși componente subword comune",
        "Tokenizarea pe cuvinte întregi e de fapt strict mai bună, dar GPT a ales BPE pur și simplu din greșeală",
      ],
      el: [
        "Θα χρειαζόταν τεράστιο λεξιλόγιο ολόκληρων λέξεων για όλες τις λέξεις, ονόματα και ορθογραφικά λάθη",
        "Οι subword μονάδες επιτρέπουν στο μοντέλο να χειρίζεται άγνωστες λέξεις σπάζοντάς τες σε γνωστά κομμάτια",
        "Συγγενείς λέξεις όπως 'run', 'running', 'runner' μοιράζονται κοινά subword συστατικά",
        "Η tokenization ολόκληρων λέξεων είναι στην ουσία αυστηρά καλύτερη, μα το GPT διάλεξε το BPE καθαρά κατά λάθος",
      ],
    },
    4: {
      en: [
        "GPT-3 simply has a built-in Python interpreter that runs the code it is asked about",
        "Its training data included billions of lines of GitHub code, so coding emerged from prediction",
        "GPT-3 copies the code directly from the public internet in real time as you ask it",
        "GPT-3 cannot really write working code — it only emits random characters that vaguely look like code",
      ],
      ro: [
        "GPT-3 pur și simplu are un interpretor Python încorporat care rulează codul despre care e întrebat",
        "Datele lui includeau miliarde de linii de cod GitHub, deci programarea a emers din predicție",
        "GPT-3 copiază codul direct de pe internetul public în timp real, pe măsură ce îl întrebi",
        "GPT-3 nu poate scrie cod funcțional — doar emite caractere aleatorii care par vag a fi cod",
      ],
      el: [
        "Το GPT-3 απλώς έχει ενσωματωμένο διερμηνέα Python που τρέχει τον κώδικα για τον οποίο ρωτιέται",
        "Τα δεδομένα του είχαν δισεκατομμύρια γραμμές κώδικα GitHub, άρα ο κώδικας προέκυψε από πρόβλεψη",
        "Το GPT-3 αντιγράφει τον κώδικα απευθείας από το δημόσιο ίντερνετ σε πραγματικό χρόνο",
        "Το GPT-3 δεν γράφει πραγματικά κώδικα — βγάζει τυχαίους χαρακτήρες που μοιάζουν αόριστα με κώδικα",
      ],
    },
  },
  '6': {
    0: {
      en: [
        "Simply buying a brand-new, fully finished car directly from a dealership showroom floor",
        "Scrapping the whole car entirely and then starting the build over again from zero",
        "Customizing the car for a purpose (race or family) and test-driving it",
        "Reading a second, different manual about an entirely unrelated type of vehicle",
      ],
      ro: [
        "Pur și simplu cumperi o mașină nouă, complet gata făcută, direct din showroomul dealerului",
        "Casezi complet toată mașina și începi construcția de la zero din nou",
        "Personalizezi mașina pentru un scop (curse sau familie) și o testezi",
        "Citești un al doilea manual diferit despre un tip complet fără legătură de vehicul",
      ],
      el: [
        "Απλώς αγοράζεις ένα ολοκαίνουριο, πλήρως έτοιμο αυτοκίνητο απευθείας από την έκθεση του αντιπροσώπου",
        "Πετάς όλο το αυτοκίνητο και ξεκινάς το χτίσιμο από την αρχή ξανά",
        "Προσαρμόζεις το αυτοκίνητο για σκοπό (αγώνες ή οικογένεια) και το δοκιμάζεις",
        "Διαβάζεις ένα δεύτερο διαφορετικό εγχειρίδιο για ένα εντελώς άσχετο όχημα",
      ],
    },
    1: {
      en: [
        "Because character-level tokenizers are simply superior to BPE in essentially all cases",
        "It's simpler, so you grasp the fundamentals (text to numbers and back) before tackling BPE",
        "Because BPE is now completely outdated and essentially nobody uses it in practice anymore",
        "Because you literally cannot implement BPE without first building a character-level tokenizer",
      ],
      ro: [
        "Pentru că tokenizatoarele pe caractere sunt pur și simplu superioare BPE în aproape toate cazurile",
        "E mai simplu, deci înțelegi fundamentele (text în numere și înapoi) înainte de BPE",
        "Pentru că BPE e acum complet depășit și practic nimeni nu-l mai folosește",
        "Pentru că literalmente nu poți implementa BPE fără a construi întâi un tokenizator pe caractere",
      ],
      el: [
        "Επειδή οι tokenizers χαρακτήρων είναι απλώς ανώτεροι από το BPE σχεδόν σε όλες τις περιπτώσεις",
        "Είναι απλούστερο, ώστε να πιάσεις τα βασικά (κείμενο σε αριθμούς και πίσω) πριν το BPE",
        "Επειδή το BPE είναι πλέον εντελώς ξεπερασμένο και ουσιαστικά κανείς δεν το χρησιμοποιεί",
        "Επειδή κυριολεκτικά δεν μπορείς να υλοποιήσεις BPE χωρίς πρώτα tokenizer χαρακτήρων",
      ],
    },
    2: {
      en: [
        "Input: [17, 482, 95] → Target: [17, 482, 95] (an exact copy)",
        "Input: [17, 482, 95] → Target: [482, 95, 221]",
        "Input: [17] → Target: [482, 95, 221, 63]",
        "Input: [63, 221, 95] → Target: [482, 17]",
      ],
      ro: [
        "Input: [17, 482, 95] → Target: [17, 482, 95] (o copie exactă)",
        "Input: [17, 482, 95] → Target: [482, 95, 221]",
        "Input: [17] → Target: [482, 95, 221, 63]",
        "Input: [63, 221, 95] → Target: [482, 17]",
      ],
      el: [
        "Input: [17, 482, 95] → Target: [17, 482, 95] (ακριβές αντίγραφο)",
        "Input: [17, 482, 95] → Target: [482, 95, 221]",
        "Input: [17] → Target: [482, 95, 221, 63]",
        "Input: [63, 221, 95] → Target: [482, 17]",
      ],
    },
    3: {
      en: [
        "Token embeddings capture what a word means (its semantics), but not where it appears",
        "Without positions, the model treats 'dog bites man' and 'man bites dog' as identical",
        "Positional embeddings are purely decorative and serve no real functional purpose at all whatsoever",
        "Together they let the model know both the meaning and the position of every token",
      ],
      ro: [
        "Embeddingurile de token captează ce înseamnă un cuvânt (semantica), dar nu unde apare",
        "Fără poziții, modelul tratează 'câinele mușcă omul' și 'omul mușcă câinele' ca identice",
        "Embeddingurile poziționale sunt pur decorative și nu au absolut niciun rol funcțional real",
        "Împreună permit modelului să știe atât sensul, cât și poziția fiecărui token",
      ],
      el: [
        "Τα token embeddings συλλαμβάνουν τι σημαίνει μια λέξη (σημασιολογία), όχι πού εμφανίζεται",
        "Χωρίς θέσεις, το μοντέλο θεωρεί 'ο σκύλος δαγκώνει' και 'δαγκώνει τον σκύλο' ίδια",
        "Τα positional embeddings είναι καθαρά διακοσμητικά και δεν έχουν κανέναν πραγματικό λειτουργικό ρόλο",
        "Μαζί επιτρέπουν στο μοντέλο να ξέρει και τη σημασία και τη θέση κάθε token",
      ],
    },
    4: {
      en: [
        "That you somehow now have a strictly faster and better model than the one OpenAI actually built",
        "Your architecture is correct — your code structurally matches OpenAI's GPT-2 exactly",
        "That you have successfully trained a brand-new model entirely from scratch on your own",
        "That GPT-2's official published weights are broken and clearly need to be fixed by you",
      ],
      ro: [
        "Că ai cumva acum un model strict mai rapid și mai bun decât cel construit efectiv de OpenAI",
        "Arhitectura ta e corectă — codul tău se potrivește structural exact cu GPT-2 al OpenAI",
        "Că ai antrenat cu succes un model complet nou, de la zero, pe cont propriu",
        "Că greutățile oficiale publicate ale GPT-2 sunt stricate și trebuie reparate de tine",
      ],
      el: [
        "Ότι κάπως έχεις τώρα ένα αυστηρά ταχύτερο και καλύτερο μοντέλο από αυτό που έφτιαξε η OpenAI",
        "Η αρχιτεκτονική σου είναι σωστή — ο κώδικάς σου ταιριάζει δομικά ακριβώς με το GPT-2",
        "Ότι εκπαίδευσες με επιτυχία ένα ολοκαίνουριο μοντέλο από το μηδέν μόνος σου",
        "Ότι τα επίσημα δημοσιευμένα βάρη του GPT-2 είναι χαλασμένα και πρέπει να τα φτιάξεις",
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

// Check every rewritten question in EVERY language; return the ones where the
// correct option is still the unique longest (the exploit is per-language,
// since each language renders its own option text).
function verifyBatch() {
  const biased = [];
  let checked = 0;
  for (const file of Object.keys(REWRITES)) {
    const d = JSON.parse(fs.readFileSync(path.join(DIR, `${file}.json`)));
    for (const qIdxStr of Object.keys(REWRITES[file])) {
      for (const lang of LANGS) {
        const q = d[lang]?.questions?.[Number(qIdxStr)];
        if (!q) continue;
        checked++;
        if (longestIsCorrect(q)) biased.push(`${file}.${lang}.q${qIdxStr}`);
      }
    }
  }
  return { biased, checked };
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
  const { biased, checked } = verifyBatch();
  console.log(`BATCH verified across all languages: ${checked} (question,lang) pairs`);
  console.log(`  still length-biased: ${biased.length}`);
  if (biased.length) console.log('  ->', biased.join(', '));
} else {
  console.log('(dry run — pass --write to apply the foundational batch)');
}
