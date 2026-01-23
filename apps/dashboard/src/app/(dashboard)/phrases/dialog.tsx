import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useMutation, type QueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import Alert from '@/components/alert';
import type { PhraseCreate } from '@repo/database/types';
import { phraseCreateSchema } from '@repo/database/validations';
import { createPhrase } from '@/actions/phrases';

export function NewPhraseDialog({
  queryClient,
  slick = false,
}: {
  queryClient: QueryClient;
  slick?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const form = useForm<PhraseCreate>({
    resolver: zodResolver(phraseCreateSchema),
    defaultValues: {
      content: '',
      source: '',
    },
  });

  const { mutate, isPending, isError, error, reset } = useMutation({
    mutationFn: (phrase: PhraseCreate) => createPhrase(phrase),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['phrases'] });
      setOpen(false);
    },
  });

  const onSubmit = (phrase: PhraseCreate) => mutate(phrase);

  return (
    <Dialog
      open={open}
      onOpenChange={state => {
        if (!state && isPending) return;
        form.reset();
        reset();
        setOpen(state);
      }}
    >
      <DialogTrigger render={<Button size={slick ? 'sm' : 'icon'} />}>
        <Plus />
        {slick && 'New Phrase'}
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="max-h-full overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-base">New Phrase</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="content"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="content">Content</FieldLabel>
                  <Textarea
                    {...field}
                    id="content"
                    placeholder="Tell me who I should be"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="source"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="source">Source</FieldLabel>
                  <Input
                    {...field}
                    id="source"
                    placeholder="Kill for You; Gigi Perez"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {isError && (
              <Alert
                title="Failed to create phrase"
                description={error.message}
                variant="destructive"
              />
            )}

            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" disabled={isPending} />}
              >
                Close
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending && <Spinner />}
                Create
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
