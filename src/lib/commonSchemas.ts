import { z } from 'zod';

export const emailString = z.string().email();
