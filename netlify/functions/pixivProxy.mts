import type { Config, Context } from '@netlify/functions';

export default async (req: Request, context: Context) => {
  const { pid } = context.params;

  return new Response(`pid: ${pid}`);
};

export const config: Config = {
  path: '/pid/:pid',
};
