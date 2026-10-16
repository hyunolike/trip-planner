import 'server-only';
import { cookies } from 'next/headers';
import { createServerApi } from './server-client';

export async function serverApi() {
  const jar = await cookies();
  const header = jar
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
  return createServerApi(header);
}
