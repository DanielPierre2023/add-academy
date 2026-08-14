"""
W2.4 — create the three lectures that are declared in _index.json but have no
file, and repair the index metadata.

Before: 68 index entries, 65 files. Clicking "Next Lecture" at the end of
Stage 2, mid-Stage 3 and the end of Stage 4 hit notFound() — three hard 404s
on the main learning path, and two fully-translated review quizzes that no
learner could ever reach.
"""
import json, os, sys

REPO = '/home/claude/add-academy'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blocks_14b import BLOCKS

CLOCK = ('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" '
         'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" '
         'stroke-linejoin="round" style="display:inline-block;vertical-align:middle;'
         'margin-right:4px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>')
LEVEL = ('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" '
         'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" '
         'stroke-linejoin="round" style="display:inline-block;vertical-align:middle;'
         'margin-right:4px"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>')

MIN = {'en': 'min read', 'ro': 'min de citit', 'el': 'λεπτά ανάγνωσης'}
LVL = {'en': 'Beginner', 'ro': 'Începător', 'el': 'Αρχάριος'}


def shell(label, stage_badge, title, subtitle, minutes, lang, body):
    return (
        '<div class="lecture-container">\n\n'
        '<div class="lecture-header">\n'
        f'<div class="lecture-label">{label} <span class="stage-badge">{stage_badge}</span></div>\n'
        f'<h1 class="lecture-title">{title}</h1>\n'
        f'<div class="lecture-subtitle">{subtitle}</div>\n'
        '<div class="lecture-meta">\n'
        f'<span class="lecture-meta-item">{CLOCK}{minutes} {MIN[lang]}</span>\n'
        f'<span class="lecture-meta-item">{LEVEL}{LVL[lang]}</span>\n'
        '</div>\n</div>\n\n'
        f'{body}\n\n</div>'
    )


# ---------------------------------------------------------------- 14b
B14 = {
 'en': """<h2>Attention is a table you can look at</h2>
<p>You have just built self-attention (Lecture 14). It works &mdash; but so far it has been algebra on a page. This lecture makes it <strong>visible</strong>. We are going to print attention as a heatmap and read it like a table, because almost every intuition people have about transformers comes from staring at these pictures.</p>
<p>The rule to hold on to is simple: <strong>each row of the table is one word asking &ldquo;who should I pay attention to?&rdquo;, and each row adds up to exactly 1.0.</strong> Attention never creates importance out of nothing; it shares out a fixed budget.</p>

<h3>A note on how we cheat here (on purpose)</h3>
<p>A real model <em>learns</em> its word vectors (Lecture 10). To keep the picture readable, we hand-write four-dimensional &ldquo;meaning&rdquo; vectors instead &mdash; one dimension for animal-ness, one for furniture-ness, one for action, one for glue-words like <em>the</em>. Nothing is trained in this lecture. That is deliberate: you should be able to see the mechanism working before any learning is involved.</p>

<h3>Code Block 1 &mdash; the heatmap</h3>
<p>Run it and read one row at a time. Watch the diagonal: most words attend to themselves, because a vector's dot product with itself is as large as it gets.</p>

<h3>Code Block 2 &mdash; the causal mask, before and after</h3>
<p>A language model predicts the next word, so it must never look at the answer. The causal mask enforces that by adding <code>-1e9</code> to every score above the diagonal <em>before</em> the softmax, so those weights come out as exactly zero.</p>
<p>Two details are worth pausing on. First, the mask is applied before softmax, not after &mdash; that is what keeps the surviving weights summing to 1. Second, look at the first row: position 0 can only see itself, so its weight is forced to 1.00. The first token's attention carries no information at all, which is why models put a throwaway token at the start.</p>

<h3>Code Block 3 &mdash; why one head is not enough</h3>
<p>A single head can express exactly one notion of &ldquo;related&rdquo;. Here we build one head that only reads the animal dimension and one that only reads the furniture dimension, and they disagree about the same sentence &mdash; which is the entire argument for multi-head attention (Lecture 16).</p>
<p>Watch for the <strong>flat row</strong> in head A. When a head's projection zeroes out a token, that token's query becomes all zeros, every score ties, and softmax returns a perfectly uniform row. A head that cannot see a token has nothing to say about it. In a trained model, a flat row like that usually means a dead or unused head &mdash; a real diagnostic you will use later.</p>

<h3>Code Block 4 &mdash; entropy, and why we divide by &radic;d<sub>k</sub></h3>
<p>Entropy measures how spread out a row is: 0 means all the weight sits on one word, ln(n) means it is spread evenly over n words. Run the block with three different scaling factors and watch what happens.</p>
<p>With a large scale, every row collapses to one weight of ~1.00 and the rest ~0.00. That looks decisive, but it is a trap: softmax gradients in that regime are almost zero, so the model stops learning. This is exactly the failure the &radic;d<sub>k</sub> divisor from Lecture 13 prevents. You derived that scaling factor algebraically; now you can watch it doing its job.</p>

<h3>What to take away</h3>
<ul>
<li>Attention is a square table; every row sums to 1.0.</li>
<li>The causal mask is a triangle of zeros, applied before softmax.</li>
<li>Different heads encode different notions of relatedness.</li>
<li>A flat row means a head has nothing to say about that token.</li>
<li>Scaling by &radic;d<sub>k</sub> keeps the table out of the zero-gradient regime.</li>
</ul>
<p><strong>Next:</strong> Lecture 15 makes the causal mask permanent, so we can start predicting real text.</p>""",

 'ro': """<h2>Atenția este un tabel pe care îl poți privi</h2>
<p>Tocmai ai construit self-attention (Lecția 14). Funcționează &mdash; dar până acum a fost algebră pe hârtie. Această lecție o face <strong>vizibilă</strong>. Vom afișa atenția ca o hartă termică și o vom citi ca pe un tabel, pentru că aproape toată intuiția despre transformere vine din privitul acestor imagini.</p>
<p>Regula de reținut este simplă: <strong>fiecare rând al tabelului este un cuvânt care întreabă &bdquo;cui ar trebui să-i acord atenție?&rdquo;, iar fiecare rând însumează exact 1.0.</strong> Atenția nu creează importanță din nimic; ea împarte un buget fix.</p>

<h3>O notă despre cum &bdquo;trișăm&rdquo; aici (intenționat)</h3>
<p>Un model real <em>învață</em> vectorii cuvintelor (Lecția 10). Ca imaginea să rămână lizibilă, scriem manual vectori de &bdquo;sens&rdquo; cu patru dimensiuni &mdash; una pentru animal, una pentru mobilier, una pentru acțiune și una pentru cuvinte de legătură. Nimic nu este antrenat în această lecție. Este intenționat: trebuie să vezi mecanismul funcționând înainte să intervină învățarea.</p>

<h3>Blocul de cod 1 &mdash; harta termică</h3>
<p>Rulează-l și citește câte un rând pe rând. Urmărește diagonala: majoritatea cuvintelor își acordă atenție lor înseși, pentru că produsul scalar al unui vector cu el însuși este maxim.</p>

<h3>Blocul de cod 2 &mdash; masca cauzală, înainte și după</h3>
<p>Un model de limbaj prezice cuvântul următor, deci nu are voie să vadă răspunsul. Masca cauzală impune asta adunând <code>-1e9</code> la fiecare scor de deasupra diagonalei <em>înainte</em> de softmax, astfel încât acele ponderi ies exact zero.</p>
<p>Două detalii merită atenție. Întâi, masca se aplică înainte de softmax, nu după &mdash; asta menține suma ponderilor rămase egală cu 1. Apoi, privește primul rând: poziția 0 se poate vedea doar pe sine, deci ponderea ei este forțată la 1.00. Atenția primului token nu transmite nicio informație, motiv pentru care modelele pun un token de sacrificiu la început.</p>

<h3>Blocul de cod 3 &mdash; de ce un singur cap nu ajunge</h3>
<p>Un singur cap poate exprima exact o noțiune de &bdquo;înrudit&rdquo;. Aici construim un cap care citește doar dimensiunea animal și unul care citește doar dimensiunea mobilier, iar ele nu sunt de acord asupra aceleiași propoziții &mdash; acesta este întregul argument pentru atenția multi-cap (Lecția 16).</p>
<p>Urmărește <strong>rândul plat</strong> din capul A. Când proiecția unui cap anulează un token, interogarea acelui token devine zero, toate scorurile devin egale, iar softmax întoarce un rând perfect uniform. Un cap care nu poate &bdquo;vedea&rdquo; un token nu are nimic de spus despre el. Într-un model antrenat, un astfel de rând plat înseamnă de obicei un cap mort sau nefolosit &mdash; un diagnostic real pe care îl vei folosi mai târziu.</p>

<h3>Blocul de cod 4 &mdash; entropia și de ce împărțim la &radic;d<sub>k</sub></h3>
<p>Entropia măsoară cât de răspândit este un rând: 0 înseamnă că toată ponderea stă pe un singur cuvânt, ln(n) înseamnă distribuție uniformă peste n cuvinte. Rulează blocul cu trei factori de scalare și urmărește ce se întâmplă.</p>
<p>Cu o scalare mare, fiecare rând se prăbușește la o pondere de ~1.00 și restul ~0.00. Pare decis, dar este o capcană: gradienții softmax în acel regim sunt aproape zero, deci modelul încetează să învețe. Exact acest eșec îl previne împărțirea la &radic;d<sub>k</sub> din Lecția 13. Ai dedus factorul algebric; acum îl poți vedea la lucru.</p>

<h3>Ce reținem</h3>
<ul>
<li>Atenția este un tabel pătrat; fiecare rând însumează 1.0.</li>
<li>Masca cauzală este un triunghi de zerouri, aplicat înainte de softmax.</li>
<li>Capete diferite codifică noțiuni diferite de înrudire.</li>
<li>Un rând plat înseamnă că un cap nu are nimic de spus despre acel token.</li>
<li>Scalarea cu &radic;d<sub>k</sub> ține tabelul departe de regimul cu gradient zero.</li>
</ul>
<p><strong>Urmează:</strong> Lecția 15 face masca cauzală permanentă, ca să putem începe să prezicem text real.</p>""",

 'el': """<h2>Η προσοχή είναι ένας πίνακας που μπορείς να δεις</h2>
<p>Μόλις έφτιαξες το self-attention (Μάθημα 14). Λειτουργεί &mdash; αλλά μέχρι τώρα ήταν άλγεβρα στο χαρτί. Αυτό το μάθημα το κάνει <strong>ορατό</strong>. Θα εκτυπώσουμε την προσοχή ως θερμικό χάρτη και θα τον διαβάσουμε σαν πίνακα, γιατί σχεδόν όλη η διαίσθηση για τα transformers προέρχεται από το να κοιτάς αυτές τις εικόνες.</p>
<p>Ο κανόνας που πρέπει να θυμάσαι είναι απλός: <strong>κάθε γραμμή του πίνακα είναι μια λέξη που ρωτά &laquo;σε ποιον πρέπει να δώσω προσοχή;&raquo;, και κάθε γραμμή αθροίζει ακριβώς 1.0.</strong> Η προσοχή δεν δημιουργεί σημασία από το τίποτα &mdash; μοιράζει έναν σταθερό προϋπολογισμό.</p>

<h3>Μια σημείωση για το πώς &laquo;κλέβουμε&raquo; εδώ (σκόπιμα)</h3>
<p>Ένα πραγματικό μοντέλο <em>μαθαίνει</em> τα διανύσματα των λέξεων (Μάθημα 10). Για να μείνει η εικόνα ευανάγνωστη, γράφουμε στο χέρι τετραδιάστατα διανύσματα &laquo;νοήματος&raquo; &mdash; μία διάσταση για το ζώο, μία για το έπιπλο, μία για τη δράση και μία για συνδετικές λέξεις. Τίποτα δεν εκπαιδεύεται σε αυτό το μάθημα. Αυτό είναι σκόπιμο: πρέπει να δεις τον μηχανισμό να δουλεύει πριν εμπλακεί η μάθηση.</p>

<h3>Μπλοκ κώδικα 1 &mdash; ο θερμικός χάρτης</h3>
<p>Τρέξε το και διάβασε μία γραμμή τη φορά. Παρατήρησε τη διαγώνιο: οι περισσότερες λέξεις δίνουν προσοχή στον εαυτό τους, επειδή το εσωτερικό γινόμενο ενός διανύσματος με τον εαυτό του είναι το μέγιστο δυνατό.</p>

<h3>Μπλοκ κώδικα 2 &mdash; η αιτιακή μάσκα, πριν και μετά</h3>
<p>Ένα γλωσσικό μοντέλο προβλέπει την επόμενη λέξη, άρα δεν πρέπει ποτέ να δει την απάντηση. Η αιτιακή μάσκα το επιβάλλει προσθέτοντας <code>-1e9</code> σε κάθε σκορ πάνω από τη διαγώνιο <em>πριν</em> το softmax, ώστε αυτά τα βάρη να βγαίνουν ακριβώς μηδέν.</p>
<p>Δύο λεπτομέρειες αξίζουν προσοχή. Πρώτον, η μάσκα εφαρμόζεται πριν το softmax, όχι μετά &mdash; αυτό κρατά το άθροισμα των υπόλοιπων βαρών στο 1. Δεύτερον, δες την πρώτη γραμμή: η θέση 0 βλέπει μόνο τον εαυτό της, οπότε το βάρος της γίνεται αναγκαστικά 1.00. Η προσοχή του πρώτου token δεν μεταφέρει καμία πληροφορία &mdash; γι' αυτό τα μοντέλα βάζουν ένα αναλώσιμο token στην αρχή.</p>

<h3>Μπλοκ κώδικα 3 &mdash; γιατί μία κεφαλή δεν αρκεί</h3>
<p>Μία κεφαλή μπορεί να εκφράσει ακριβώς μία έννοια του &laquo;σχετικού&raquo;. Εδώ φτιάχνουμε μια κεφαλή που διαβάζει μόνο τη διάσταση του ζώου και μια που διαβάζει μόνο τη διάσταση του επίπλου, και διαφωνούν για την ίδια πρόταση &mdash; αυτό είναι όλο το επιχείρημα για την πολυκέφαλη προσοχή (Μάθημα 16).</p>
<p>Πρόσεξε την <strong>επίπεδη γραμμή</strong> στην κεφαλή Α. Όταν η προβολή μιας κεφαλής μηδενίζει ένα token, το ερώτημα του token γίνεται μηδέν, όλα τα σκορ ισοβαθμούν και το softmax επιστρέφει μια τελείως ομοιόμορφη γραμμή. Μια κεφαλή που δεν &laquo;βλέπει&raquo; ένα token δεν έχει τίποτα να πει γι' αυτό. Σε εκπαιδευμένο μοντέλο, μια τέτοια επίπεδη γραμμή συνήθως σημαίνει νεκρή ή αχρησιμοποίητη κεφαλή &mdash; ένα πραγματικό διαγνωστικό που θα χρησιμοποιήσεις αργότερα.</p>

<h3>Μπλοκ κώδικα 4 &mdash; εντροπία και γιατί διαιρούμε με &radic;d<sub>k</sub></h3>
<p>Η εντροπία μετρά πόσο απλωμένη είναι μια γραμμή: 0 σημαίνει ότι όλο το βάρος είναι σε μία λέξη, ln(n) σημαίνει ομοιόμορφη κατανομή σε n λέξεις. Τρέξε το μπλοκ με τρεις διαφορετικούς συντελεστές κλίμακας και δες τι συμβαίνει.</p>
<p>Με μεγάλη κλίμακα, κάθε γραμμή καταρρέει σε ένα βάρος ~1.00 και τα υπόλοιπα ~0.00. Μοιάζει αποφασιστικό, αλλά είναι παγίδα: οι κλίσεις του softmax εκεί είναι σχεδόν μηδέν, οπότε το μοντέλο σταματά να μαθαίνει. Ακριβώς αυτή την αποτυχία αποτρέπει ο διαιρέτης &radic;d<sub>k</sub> από το Μάθημα 13. Τον υπολόγισες αλγεβρικά &mdash; τώρα τον βλέπεις να δουλεύει.</p>

<h3>Τι κρατάμε</h3>
<ul>
<li>Η προσοχή είναι τετραγωνικός πίνακας &mdash; κάθε γραμμή αθροίζει 1.0.</li>
<li>Η αιτιακή μάσκα είναι ένα τρίγωνο μηδενικών, πριν το softmax.</li>
<li>Διαφορετικές κεφαλές κωδικοποιούν διαφορετικές έννοιες συσχέτισης.</li>
<li>Μια επίπεδη γραμμή σημαίνει ότι μια κεφαλή δεν έχει τίποτα να πει.</li>
<li>Η κλιμάκωση με &radic;d<sub>k</sub> κρατά τον πίνακα μακριά από μηδενικές κλίσεις.</li>
</ul>
<p><strong>Επόμενο:</strong> Το Μάθημα 15 κάνει την αιτιακή μάσκα μόνιμη, ώστε να αρχίσουμε να προβλέπουμε πραγματικό κείμενο.</p>"""}


def review_body(lang, stage_label, covers, next_topic):
    if lang == 'en':
        return f"""<h2>Pause. Check what stuck.</h2>
<p>You have just finished {stage_label}. Before moving on to {next_topic}, this is a short checkpoint &mdash; no new material, no code, just {covers}.</p>
<p>Retrieval practice is not a formality. Trying to recall something you half-remember is what moves it into long-term memory; re-reading the lecture feels productive but does far less. Getting a question wrong here is <strong>useful</strong> &mdash; the questions you miss are automatically added to your review queue and will come back to you at spaced intervals.</p>
<h3>How to use this</h3>
<ul>
<li>Answer from memory first. Do not scroll back &mdash; a wrong answer you thought about beats a right answer you looked up.</li>
<li>Read the explanation for every question, including the ones you got right.</li>
<li>If you score below 70%, revisit the lectures named in the explanations before continuing.</li>
</ul>
<p>Take the quiz below when you are ready.</p>"""
    if lang == 'ro':
        return f"""<h2>Oprește-te. Verifică ce a rămas.</h2>
<p>Tocmai ai terminat {stage_label}. Înainte de a trece la {next_topic}, acesta este un scurt punct de control &mdash; fără material nou, fără cod, doar {covers}.</p>
<p>Practica de recuperare nu este o formalitate. Încercarea de a-ți aminti ceva pe jumătate știut este ceea ce mută informația în memoria de lungă durată; recitirea lecției pare productivă, dar face mult mai puțin. A greși aici este <strong>util</strong> &mdash; întrebările ratate sunt adăugate automat în coada ta de recapitulare și îți vor reveni la intervale distanțate.</p>
<h3>Cum să folosești acest test</h3>
<ul>
<li>Răspunde întâi din memorie. Nu derula înapoi &mdash; un răspuns greșit la care te-ai gândit valorează mai mult decât unul corect căutat.</li>
<li>Citește explicația la fiecare întrebare, inclusiv la cele nimerite.</li>
<li>Dacă obții sub 70%, revizitează lecțiile menționate în explicații înainte de a continua.</li>
</ul>
<p>Începe testul de mai jos când ești pregătit.</p>"""
    return f"""<h2>Σταμάτα. Έλεγξε τι έμεινε.</h2>
<p>Μόλις ολοκλήρωσες {stage_label}. Πριν προχωρήσεις στο {next_topic}, αυτό είναι ένα σύντομο σημείο ελέγχου &mdash; χωρίς νέο υλικό, χωρίς κώδικα, μόνο {covers}.</p>
<p>Η εξάσκηση ανάκλησης δεν είναι τυπικότητα. Η προσπάθεια να θυμηθείς κάτι που ξέρεις μισά είναι αυτό που το μεταφέρει στη μακροπρόθεσμη μνήμη &mdash; η επανανάγνωση του μαθήματος μοιάζει παραγωγική αλλά κάνει πολύ λιγότερα. Το να κάνεις λάθος εδώ είναι <strong>χρήσιμο</strong>: οι ερωτήσεις που χάνεις μπαίνουν αυτόματα στην ουρά επανάληψης και θα επιστρέψουν σε αραιωμένα διαστήματα.</p>
<h3>Πώς να το χρησιμοποιήσεις</h3>
<ul>
<li>Απάντησε πρώτα από μνήμη. Μην γυρίσεις πίσω &mdash; μια λάθος απάντηση που σκέφτηκες αξίζει περισσότερο από μια σωστή που βρήκες.</li>
<li>Διάβασε την εξήγηση σε κάθε ερώτηση, ακόμη και σε όσες απάντησες σωστά.</li>
<li>Αν πάρεις κάτω από 70%, ξαναδές τα μαθήματα που αναφέρονται στις εξηγήσεις.</li>
</ul>
<p>Ξεκίνα το κουίζ παρακάτω όταν είσαι έτοιμος.</p>"""


TITLES = {
 '14b': {'en': 'Visualizing Attention: Interactive Heatmap Explorer',
         'ro': 'Vizualizarea Atenției: Explorator Interactiv de Hărți Termice',
         'el': 'Οπτικοποίηση της Προσοχής: Διαδραστικός Θερμικός Χάρτης'},
 'review-s2': {'en': 'Stage 1 Review Quiz — Test Your Fundamentals',
               'ro': 'Test de Recapitulare Etapa 1 — Verifică-ți Fundamentele',
               'el': 'Κουίζ Επανάληψης Σταδίου 1 — Έλεγξε τα Θεμέλιά σου'},
 'review-s4': {'en': 'Stages 1-3 Review Quiz — Test Your Knowledge',
               'ro': 'Test de Recapitulare Etapele 1-3 — Verifică-ți Cunoștințele',
               'el': 'Κουίζ Επανάληψης Σταδίων 1-3 — Έλεγξε τις Γνώσεις σου'},
}
SUBS = {
 '14b': {'en': 'See the attention table, the causal mask and multi-head disagreement — no training required',
         'ro': 'Vezi tabelul de atenție, masca cauzală și dezacordul dintre capete — fără antrenare',
         'el': 'Δες τον πίνακα προσοχής, την αιτιακή μάσκα και τη διαφωνία των κεφαλών — χωρίς εκπαίδευση'},
 'review-s2': {'en': 'A five-question checkpoint before attention begins',
               'ro': 'Un punct de control cu cinci întrebări înainte de atenție',
               'el': 'Ένα σημείο ελέγχου πέντε ερωτήσεων πριν την προσοχή'},
 'review-s4': {'en': 'A seven-question checkpoint before pretraining begins',
               'ro': 'Un punct de control cu șapte întrebări înainte de preantrenare',
               'el': 'Ένα σημείο ελέγχου επτά ερωτήσεων πριν την προεκπαίδευση'},
}
BADGE = {'14b': 'Stage 3: Attention', 'review-s2': 'Stage 2: Tokenization',
         'review-s4': 'Stage 4: Architecture'}
LABEL = {'14b': 'LECTURE 14b', 'review-s2': 'REVIEW', 'review-s4': 'REVIEW'}
MINUTES = {'14b': 35, 'review-s2': 15, 'review-s4': 15}

REVIEW_ARGS = {
 'review-s2': {
   'en': ('Stage 2 on Tokenization', 'five questions on the fundamentals from Stage 1', 'attention'),
   'ro': ('Etapa 2 despre Tokenizare', 'cinci întrebări despre fundamentele din Etapa 1', 'atenție'),
   'el': ('το Στάδιο 2 για την Tokenization', 'πέντε ερωτήσεις για τα θεμέλια του Σταδίου 1', 'την προσοχή'),
 },
 'review-s4': {
   'en': ('Stage 4 and built a full GPT-2 from scratch', 'seven questions spanning Stages 1 to 3', 'pretraining'),
   'ro': ('Etapa 4 și ai construit un GPT-2 complet de la zero', 'șapte întrebări din Etapele 1-3', 'preantrenare'),
   'el': ('το Στάδιο 4 και έφτιαξες ένα πλήρες GPT-2', 'επτά ερωτήσεις από τα Στάδια 1 έως 3', 'την προεκπαίδευση'),
 },
}


def build():
    out = {}
    # --- 14b ---
    content = {}
    for lang in ('en', 'ro', 'el'):
        content[lang] = shell(LABEL['14b'], BADGE['14b'], TITLES['14b'][lang],
                              SUBS['14b'][lang], MINUTES['14b'], lang, B14[lang])
    order = ['heatmap', 'mask', 'heads', 'entropy']
    titles = {'heatmap': 'Attention Heatmap', 'mask': 'The Causal Mask',
              'heads': 'Three Heads Compared', 'entropy': 'Attention Entropy'}
    out['14b'] = {
        'id': '14b',
        'title': TITLES['14b'],
        'content': content,
        'codeBlocks': [
            {'id': f'block-{i}', 'title': titles[k], 'code': BLOCKS[k],
             'language': 'python', 'runnable': True}
            for i, k in enumerate(order)
        ],
    }
    # --- reviews ---
    for rid in ('review-s2', 'review-s4'):
        content = {}
        for lang in ('en', 'ro', 'el'):
            stage_label, covers, nxt = REVIEW_ARGS[rid][lang]
            content[lang] = shell(LABEL[rid], BADGE[rid], TITLES[rid][lang],
                                  SUBS[rid][lang], MINUTES[rid], lang,
                                  review_body(lang, stage_label, covers, nxt))
        out[rid] = {'id': rid, 'title': TITLES[rid], 'content': content, 'codeBlocks': []}
    return out


def main():
    write = '--write' in sys.argv
    built = build()
    for lid, doc in built.items():
        path = os.path.join(REPO, f'src/content/lectures/{lid}.json')
        exists = os.path.exists(path)
        print(f"{'WOULD WRITE' if not write else 'WROTE'} {lid}.json "
              f"(existed={exists}, codeBlocks={len(doc['codeBlocks'])}, "
              f"langs={sorted(doc['content'])})")
        if write:
            json.dump(doc, open(path, 'w'), ensure_ascii=False, indent=2)

    # --- index metadata repair ---
    ipath = os.path.join(REPO, 'src/content/lectures/_index.json')
    idx = json.load(open(ipath))
    fixes = []
    for l in idx['lectures']:
        lid = l['id']
        qpath = os.path.join(REPO, f'src/content/quizzes/{lid}.json')
        real = os.path.exists(qpath)
        if bool(l.get('hasQuiz')) != real:
            fixes.append(f"  {lid}: hasQuiz {l.get('hasQuiz')} -> {real}")
            l['hasQuiz'] = real
        if lid == '14b':
            if l.get('codeBlockCount') != 4:
                fixes.append(f"  14b: codeBlockCount {l.get('codeBlockCount')} -> 4")
                l['codeBlockCount'] = 4
    total_cb = sum(l.get('codeBlockCount', 0) for l in idx['lectures'])
    if idx.get('totalCodeBlocks') != total_cb:
        fixes.append(f"  totalCodeBlocks {idx.get('totalCodeBlocks')} -> {total_cb}")
        idx['totalCodeBlocks'] = total_cb
    print('\nINDEX FIXES:')
    print('\n'.join(fixes) if fixes else '  (none)')
    if write:
        json.dump(idx, open(ipath, 'w'), ensure_ascii=False, indent=2)
        print('wrote _index.json')
    return 0


if __name__ == '__main__':
    sys.exit(main())
