import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, type QueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import Alert from '@/components/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import type { FeedbackStatus } from '@repo/database/types';
import { setResponse } from '@/actions/feedbacks';
import { feedbackFinalStates } from '@/definitions/feedbacks';
import z from 'zod';

type FeedbackResponseForm = {
  response: string;
};

export function FeedbackResponseForm({
  queryClient,
  id,
  status,
  response,
}: {
  queryClient: QueryClient;
  id: string;
  status: FeedbackStatus;
  response: string | null;
}) {
  const disabled = feedbackFinalStates.includes(status);

  const form = useForm<FeedbackResponseForm>({
    disabled,
    resolver: zodResolver(z.object({ response: z.string().nonempty() })),
    defaultValues: {
      response: response || '',
    },
  });

  const { mutate, isPending, isError, error, reset } = useMutation({
    mutationFn: (data: FeedbackResponseForm) => setResponse(id, data.response),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['feedback', id] });
      toast.success('Feedback response submitted');
    },
  });

  const onSubmit = (data: FeedbackResponseForm) => mutate(data);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="md:max-w-lg">
      <FieldGroup>
        <Controller
          name="response"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <Textarea
                {...field}
                id="response"
                placeholder="Write your response..."
                aria-invalid={fieldState.invalid}
                className="min-h-32"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {isError && (
          <Alert
            title="Failed to submit response"
            description={error.message}
            variant="destructive"
          />
        )}

        <div className="flex items-center gap-2">
          <Button
            type="submit"
            disabled={isPending || disabled}
            className="flex-1"
          >
            {isPending && <Spinner />}
            Submit
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={isPending || disabled}
            onClick={() => {
              reset();
              form.reset();
            }}
          >
            <RotateCcw />
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
