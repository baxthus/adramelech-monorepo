import { ExpectedError } from '~/types/errors';
import { type Precondition } from '~/types/precondition';

const precondition: Precondition = async (intr) => {
  const application = await intr.client.application.fetch();
  const owner = await intr.client.users.fetch(application.owner!.id);
  if (intr.user.id !== owner.id)
    throw new ExpectedError(
      'You must be the owner of the bot to use this command',
    );
};

export default precondition;
