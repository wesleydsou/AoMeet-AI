import { MessageBanner } from "@/components/message-banner";
import { MeetingCreateForm } from "@/components/meeting-create-form";
import { SectionHeader } from "@/components/section-header";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function NewMeetingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    orderBy: { companyName: "asc" },
    select: { id: true, companyName: true },
  });

  return (
    <>
      <SectionHeader
        eyebrow="Cadastro"
        title="Nova reuniao"
        description="Crie a reuniao, faça upload de audio ou video, importe uma transcricao ou cole o conteudo manualmente."
        action={<Link href="/clients" className="btn-secondary">Criar cliente</Link>}
      />
      <MessageBanner message={params.error} tone="error" />
      <MeetingCreateForm clients={clients} defaultLanguage={user.defaultLanguage} />
    </>
  );
}
