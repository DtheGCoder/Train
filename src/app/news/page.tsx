import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/ui";
import { NewsInbox } from "@/components/news-inbox";
import { NEWS, parseReadIds } from "@/lib/news";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const user = await requireUser();
  const settings = await db.settings.findUnique({
    where: { userId: user.id },
    select: { readNewsJson: true },
  });
  const readIds = parseReadIds(settings?.readNewsJson);

  return (
    <div className="space-y-5">
      <PageHeader title="Postfach" subtitle="Neuigkeiten & Updates rund um Train" />
      {NEWS.length === 0 ? (
        <EmptyState
          title="Keine Neuigkeiten"
          description="Sobald es etwas Neues gibt, landet es hier."
        />
      ) : (
        <div className="space-y-3">
          <NewsInbox items={NEWS} readIds={readIds} />
        </div>
      )}
    </div>
  );
}
