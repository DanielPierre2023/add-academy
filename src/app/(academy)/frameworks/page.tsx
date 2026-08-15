'use client';

import { useAcademyStore } from '@/lib/store/academy-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Cpu,
  Layers,
  FlaskConical,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import type { Language } from '@/types';

const FRAMEWORKS = [
  {
    id: 'pytorch',
    icon: Layers,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    name: { en: 'PyTorch', ro: 'PyTorch', el: 'PyTorch' },
    tagline: {
      en: 'Dynamic graphs, research-first',
      ro: 'Grafuri dinamice, cercetare mai întâi',
      el: 'Δυναμικά γραφήματα, πρώτα η έρευνα',
    },
    description: {
      en: 'The framework used throughout this course. PyTorch excels at research and rapid prototyping with its eager execution mode. Most LLM papers (GPT, LLaMA, Mistral) release PyTorch code first.',
      ro: 'Cadrul utilizat în acest curs. PyTorch excelează în cercetare și prototipare rapidă cu modul de execuție eager. Majoritatea lucrărilor LLM (GPT, LLaMA, Mistral) lansează cod PyTorch mai întâi.',
      el: 'Το framework που χρησιμοποιείται σε αυτό το μάθημα. Το PyTorch υπερέχει στην έρευνα και τη γρήγορη δημιουργία πρωτοτύπων. Τα περισσότερα LLM papers κυκλοφορούν πρώτα κώδικα PyTorch.',
    },
    strengths: {
      en: ['Eager execution — debug like normal Python', 'Dominant in academia and LLM research', 'Hugging Face ecosystem', 'CUDA/ROCm GPU support'],
      ro: ['Execuție eager — depanare ca Python normal', 'Dominant în mediul academic și cercetarea LLM', 'Ecosistemul Hugging Face', 'Suport GPU CUDA/ROCm'],
      el: ['Eager execution — debug σαν Python', 'Κυρίαρχο στην ακαδημία και LLM', 'Οικοσύστημα Hugging Face', 'Υποστήριξη GPU CUDA/ROCm'],
    },
    usedIn: ['GPT-2/3/4 (OpenAI)', 'LLaMA (Meta)', 'Mistral', 'Stable Diffusion'],
    lectures: ['1', '13', '19', '25', '33'],
    docs: 'https://pytorch.org/docs/stable/',
    recommended: true,
  },
  {
    id: 'jax',
    icon: FlaskConical,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    name: { en: 'JAX / Flax', ro: 'JAX / Flax', el: 'JAX / Flax' },
    tagline: {
      en: 'Functional, XLA-compiled, TPU-native',
      ro: 'Funcțional, compilat XLA, nativ TPU',
      el: 'Λειτουργικό, μεταγλωττισμένο XLA, εγγενές TPU',
    },
    description: {
      en: 'Google\'s high-performance ML framework. JAX combines NumPy-like syntax with automatic differentiation and XLA compilation. Ideal for TPU training and large-scale distributed workloads. Gemini and PaLM were trained with JAX.',
      ro: 'Cadrul ML de înaltă performanță al Google. JAX combină sintaxa similară NumPy cu diferențiere automată și compilare XLA. Ideal pentru antrenare TPU și sarcini distribuite la scară largă.',
      el: 'Το framework ML υψηλής απόδοσης της Google. Το JAX συνδυάζει σύνταξη NumPy με αυτόματη διαφοροποίηση και μεταγλώττιση XLA. Ιδανικό για TPU.',
    },
    strengths: {
      en: ['XLA compilation for extreme speed', 'Native TPU support', 'Functional programming model', 'vmap/pmap for auto-vectorization'],
      ro: ['Compilare XLA pentru viteză extremă', 'Suport nativ TPU', 'Model de programare funcțională', 'vmap/pmap pentru auto-vectorizare'],
      el: ['Μεταγλώττιση XLA για ταχύτητα', 'Εγγενής υποστήριξη TPU', 'Λειτουργικό μοντέλο', 'vmap/pmap για auto-vectorization'],
    },
    usedIn: ['Gemini (Google)', 'PaLM (Google)', 'Whisper v3', 'AlphaFold'],
    lectures: ['25', '26', '33'],
    docs: 'https://jax.readthedocs.io/',
    recommended: false,
  },
  {
    id: 'tensorflow',
    icon: Cpu,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    name: { en: 'TensorFlow / Keras', ro: 'TensorFlow / Keras', el: 'TensorFlow / Keras' },
    tagline: {
      en: 'Production-grade, deployment ecosystem',
      ro: 'Grad de producție, ecosistem de implementare',
      el: 'Βαθμού παραγωγής, οικοσύστημα ανάπτυξης',
    },
    description: {
      en: 'Google\'s mature ML framework with the strongest deployment story. TensorFlow Serving, TFLite, and TF.js make it easy to deploy models anywhere — from servers to phones to browsers. Keras 3 now supports JAX and PyTorch backends too.',
      ro: 'Cadrul ML matur al Google cu cea mai puternică poveste de implementare. TensorFlow Serving, TFLite și TF.js facilitează implementarea modelelor oriunde.',
      el: 'Το ώριμο ML framework της Google με την ισχυρότερη υποστήριξη ανάπτυξης. TensorFlow Serving, TFLite και TF.js.',
    },
    strengths: {
      en: ['TF Serving / TFLite / TF.js deployment', 'Keras 3 multi-backend support', 'TensorBoard visualization', 'Largest production footprint'],
      ro: ['Implementare TF Serving / TFLite / TF.js', 'Suport multi-backend Keras 3', 'Vizualizare TensorBoard', 'Cea mai mare prezență în producție'],
      el: ['TF Serving / TFLite / TF.js', 'Keras 3 multi-backend', 'Οπτικοποίηση TensorBoard', 'Μεγαλύτερο production footprint'],
    },
    usedIn: ['BERT (Google)', 'T5 (Google)', 'Production ML pipelines', 'Mobile/Edge AI'],
    lectures: ['25', '33', '34'],
    docs: 'https://www.tensorflow.org/api_docs',
    recommended: false,
  },
];

const COMPARISON_ROWS = [
  {
    label: { en: 'Execution Mode', ro: 'Mod Execuție', el: 'Τρόπος Εκτέλεσης' },
    pytorch: 'Eager (dynamic)',
    jax: 'JIT compiled (XLA)',
    tensorflow: 'Eager + Graph',
  },
  {
    label: { en: 'Best Hardware', ro: 'Cel Mai Bun Hardware', el: 'Καλύτερο Υλικό' },
    pytorch: 'NVIDIA GPUs',
    jax: 'Google TPUs',
    tensorflow: 'GPUs / TPUs / Edge',
  },
  {
    label: { en: 'Learning Curve', ro: 'Curba de Învățare', el: 'Καμπύλη Μάθησης' },
    pytorch: 'Moderate',
    jax: 'Steep (functional)',
    tensorflow: 'Easy (Keras)',
  },
  {
    label: { en: 'Debugging', ro: 'Depanare', el: 'Αποσφαλμάτωση' },
    pytorch: 'Excellent (pdb)',
    jax: 'Hard (pure functions)',
    tensorflow: 'Good (eager mode)',
  },
  {
    label: { en: 'Deployment', ro: 'Implementare', el: 'Ανάπτυξη' },
    pytorch: 'TorchServe / ONNX',
    jax: 'SavedModel / custom',
    tensorflow: 'TF Serving / Lite / JS',
  },
  {
    label: { en: 'Community', ro: 'Comunitate', el: 'Κοινότητα' },
    pytorch: 'Largest (research)',
    jax: 'Growing fast',
    tensorflow: 'Large (enterprise)',
  },
];

export default function FrameworksPage() {
  const language = useAcademyStore((s) => s.language) as Language;

  const texts = {
    en: {
      title: 'Framework Tracks',
      subtitle: 'This course teaches concepts framework-agnostically, with code examples in PyTorch. Here\'s how the three major frameworks compare — and how to apply what you learn to each.',
      comparison: 'Side-by-Side Comparison',
      relatedLectures: 'Related Lectures',
      viewDocs: 'Official Docs',
      recommended: 'Course Default',
      usedIn: 'Used In',
      strengths: 'Key Strengths',
      roadmap: 'Framework Migration Guides',
      roadmapDesc: 'We\'re building lecture supplements that show how to translate each PyTorch code example into JAX and TensorFlow. Follow the GitHub repo for updates.',
    },
    ro: {
      title: 'Trasee Framework',
      subtitle: 'Acest curs predă concepte independent de framework, cu exemple de cod în PyTorch. Iată cum se compară cele trei framework-uri majore.',
      comparison: 'Comparație Directă',
      relatedLectures: 'Lecții Relevante',
      viewDocs: 'Documentație Oficială',
      recommended: 'Implicit în Curs',
      usedIn: 'Utilizat În',
      strengths: 'Puncte Forte',
      roadmap: 'Ghiduri de Migrare Framework',
      roadmapDesc: 'Construim suplimente de lecții care arată cum să traduceți fiecare exemplu de cod PyTorch în JAX și TensorFlow.',
    },
    el: {
      title: 'Μονοπάτια Framework',
      subtitle: 'Αυτό το μάθημα διδάσκει έννοιες ανεξάρτητα από framework, με παραδείγματα κώδικα σε PyTorch. Δείτε πώς συγκρίνονται τα τρία κύρια frameworks.',
      comparison: 'Σύγκριση',
      relatedLectures: 'Σχετικά Μαθήματα',
      viewDocs: 'Επίσημα Docs',
      recommended: 'Προεπιλογή Μαθήματος',
      usedIn: 'Χρησιμοποιείται σε',
      strengths: 'Δυνατά Σημεία',
      roadmap: 'Οδηγοί Μετάβασης Framework',
      roadmapDesc: 'Δημιουργούμε συμπληρώματα μαθημάτων που δείχνουν πώς να μεταφράσετε κάθε παράδειγμα PyTorch σε JAX και TensorFlow.',
    },
  };

  const txt = texts[language] || texts.en;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="text-center">
        <BarChart3 className="mx-auto h-16 w-16 text-secondary mb-4" />
        <h1 className="text-3xl font-bold font-heading mb-2">{txt.title}</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">{txt.subtitle}</p>
      </div>

      {/* Framework Cards */}
      <div className="grid gap-6">
        {FRAMEWORKS.map((fw) => {
          const Icon = fw.icon;
          const desc = fw.description[language] || fw.description.en;
          const tagline = fw.tagline[language] || fw.tagline.en;
          const strengths = fw.strengths[language] || fw.strengths.en;

          return (
            <Card key={fw.id} className={`${fw.borderColor} border-2`}>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${fw.bg}`}>
                      <Icon className={`h-6 w-6 ${fw.color}`} />
                    </div>
                    <div>
                      <span className="text-xl">{fw.name[language] || fw.name.en}</span>
                      <p className="text-sm text-muted-foreground font-normal mt-0.5">{tagline}</p>
                    </div>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {fw.recommended && (
                      <Badge className="bg-green-600 text-white gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {txt.recommended}
                      </Badge>
                    )}
                    <a
                      href={fw.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {txt.viewDocs}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{desc}</p>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Strengths */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">{txt.strengths}</h4>
                    <ul className="space-y-1">
                      {strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${fw.color}`} />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Used In */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">{txt.usedIn}</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {fw.usedIn.map((project) => (
                        <Badge key={project} variant="secondary" className="text-xs">
                          {project}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Related Lectures */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {txt.relatedLectures}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {fw.lectures.map((id) => (
                      <Link
                        key={id}
                        href={`/lectures/${id}`}
                        className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium hover:bg-muted/80 transition-colors"
                      >
                        Lecture {id}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>{txt.comparison}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-semibold text-muted-foreground"></th>
                  <th className="text-left py-2 px-4 font-semibold text-orange-500">PyTorch</th>
                  <th className="text-left py-2 px-4 font-semibold text-purple-500">JAX</th>
                  <th className="text-left py-2 px-4 font-semibold text-amber-500">TensorFlow</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-muted-foreground whitespace-nowrap">
                      {row.label[language] || row.label.en}
                    </td>
                    <td className="py-2.5 px-4">{row.pytorch}</td>
                    <td className="py-2.5 px-4">{row.jax}</td>
                    <td className="py-2.5 px-4">{row.tensorflow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Roadmap */}
      <Card className="border-secondary/50 bg-secondary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg p-2 bg-secondary/20">
              <ArrowRight className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <h3 className="font-semibold">{txt.roadmap}</h3>
              <p className="text-sm text-muted-foreground mt-1">{txt.roadmapDesc}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
