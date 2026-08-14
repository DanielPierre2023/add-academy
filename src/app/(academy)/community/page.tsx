'use client';

import Link from 'next/link';

import { useAcademyStore } from '@/lib/store/academy-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  MessageSquare,
  BookOpen,
  Globe,
  ExternalLink,
} from 'lucide-react';
import type { Language } from '@/types';

export default function CommunityPage() {
  const language = useAcademyStore((s) => s.language) as Language;

  const texts = {
    en: {
      title: 'Community',
      subtitle: 'Connect with fellow AI learners and practitioners',
      discussTitle: 'Discussion Forum',
      discussDesc:
        'Ask questions, share insights, and collaborate with other students on AI topics. Our community forum is coming soon.',
      resourcesTitle: 'Shared Resources',
      resourcesDesc:
        'Access community-curated resources, code snippets, and project examples shared by students and instructors.',
      eventsTitle: 'Events & Workshops',
      eventsDesc:
        'Join live workshops, webinars, and study groups organized by the ADD Academica community.',
      globalTitle: 'Global Network',
      globalDesc:
        'Connect with AI learners from Romania, Greece, and beyond. Our multilingual community spans multiple countries.',
      comingSoon: 'Coming Soon',
      comingSoonDesc:
        'We are building a vibrant community space for ADD Academica students. Stay tuned for discussion forums, study groups, and collaborative learning features.',
      startLearning: 'Start Learning',
    },
    ro: {
      title: 'Comunitate',
      subtitle: 'Conecteaza-te cu alti studenti si practicieni AI',
      discussTitle: 'Forum de Discutii',
      discussDesc:
        'Pune intrebari, impartaseste idei si colaboreaza cu alti studenti pe teme de AI. Forumul nostru vine in curand.',
      resourcesTitle: 'Resurse Partajate',
      resourcesDesc:
        'Acceseaza resurse curate de comunitate, fragmente de cod si exemple de proiecte.',
      eventsTitle: 'Evenimente si Ateliere',
      eventsDesc:
        'Participa la ateliere live, webinarii si grupuri de studiu organizate de comunitatea ADD Academica.',
      globalTitle: 'Retea Globala',
      globalDesc:
        'Conecteaza-te cu studenti AI din Romania, Grecia si nu numai. Comunitatea noastra multilingva se intinde in mai multe tari.',
      comingSoon: 'In Curand',
      comingSoonDesc:
        'Construim un spatiu de comunitate vibrant pentru studentii ADD Academica. Ramai la curent pentru forumuri, grupuri de studiu si functii de invatare colaborativa.',
      startLearning: 'Incepe sa Inveti',
    },
    el: {
      title: 'Κοινότητα',
      subtitle: 'Συνδεθείτε με συμφοιτητές και επαγγελματίες AI',
      discussTitle: 'Φόρουμ Συζητήσεων',
      discussDesc:
        'Κάντε ερωτήσεις, μοιραστείτε ιδέες και συνεργαστείτε με άλλους φοιτητές. Το φόρουμ μας έρχεται σύντομα.',
      resourcesTitle: 'Κοινοί Πόροι',
      resourcesDesc:
        'Αποκτήστε πρόσβαση σε πόρους, αποσπάσματα κώδικα και παραδείγματα έργων.',
      eventsTitle: 'Εκδηλώσεις & Εργαστήρια',
      eventsDesc:
        'Συμμετέχετε σε ζωντανά εργαστήρια, webinars και ομάδες μελέτης.',
      globalTitle: 'Παγκόσμιο Δίκτυο',
      globalDesc:
        'Συνδεθείτε με μαθητές AI από τη Ρουμανία, την Ελλάδα και πέρα.',
      comingSoon: 'Έρχεται Σύντομα',
      comingSoonDesc:
        'Χτίζουμε έναν ζωντανό χώρο κοινότητας για τους φοιτητές του ADD Academica.',
      startLearning: 'Ξεκινήστε τη Μάθηση',
    },
  };

  const txt = texts[language] || texts.en;

  const features = [
    { icon: MessageSquare, title: txt.discussTitle, desc: txt.discussDesc },
    { icon: BookOpen, title: txt.resourcesTitle, desc: txt.resourcesDesc },
    { icon: Globe, title: txt.eventsTitle, desc: txt.eventsDesc },
    { icon: Users, title: txt.globalTitle, desc: txt.globalDesc },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="text-center">
        <Users className="mx-auto h-16 w-16 text-secondary mb-4" />
        <h1 className="text-3xl font-bold font-heading mb-2">{txt.title}</h1>
        <p className="text-muted-foreground">{txt.subtitle}</p>
      </div>

      {/* Coming Soon Banner */}
      <Card className="border-secondary/50 bg-secondary/5">
        <CardContent className="pt-6 text-center">
          <h2 className="font-semibold text-xl mb-2">{txt.comingSoon}</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-4">
            {txt.comingSoonDesc}
          </p>
          <Link href="/lectures/0">
            <Button variant="default" className="gap-2">
              <BookOpen className="h-4 w-4" />
              {txt.startLearning}
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature) => (
          <Card key={feature.title} className="border-muted">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
                  <feature.icon className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
