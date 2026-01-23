import DashboardInset from '@/components/dashboard/inset';
import Alert from '@/components/alert';
import z from 'zod';

export default async function FeedbackLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  const isValid = z.nanoid().safeParse(id).success;

  return (
    <DashboardInset
      breadcrumbs={[
        {
          title: 'Feedbacks',
          href: '/feedbacks',
        },
        {
          title: isValid ? id : 'Invalid ID',
          href: `/feedbacks/${id}`,
        },
      ]}
    >
      {isValid ? (
        children
      ) : (
        <Alert
          title="Invalid ID"
          description="The provided ID is not a valid nanoid"
          variant="destructive"
        />
      )}
    </DashboardInset>
  );
}
