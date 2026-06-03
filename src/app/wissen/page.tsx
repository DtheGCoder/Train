import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { PageHeader, Card, InfoBox } from "@/components/ui";
import { KNOWLEDGE } from "@/lib/coach-knowledge";

export const dynamic = "force-static";

export default function WissenPage() {
  return (
    <div className="space-y-5">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Coach & Profil
      </Link>

      <PageHeader
        title="Trainingswissen"
        subtitle="Die Wissensbasis deines Coaches – kompakt und evidenz-orientiert."
      />

      <InfoBox>
        Diese Grundlagen nutzt der Coach für seine Empfehlungen und den
        Plan-Check. Es sind Orientierungswerte aus der Trainingswissenschaft –
        keine starren Regeln und keine medizinische Beratung.
      </InfoBox>

      {KNOWLEDGE.map((section) => (
        <Card key={section.key} className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-primary" />
            <h2 className="font-semibold">{section.title}</h2>
          </div>
          <dl className="space-y-3">
            {section.items.map((item) => (
              <div key={item.q}>
                <dt className="text-sm font-semibold">{item.q}</dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-muted">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      ))}
    </div>
  );
}
