import { cp, readFile, rm, writeFile } from 'node:fs/promises';

const source = new URL('./public/', import.meta.url);
const output = new URL('./dist/', import.meta.url);

await rm(output, { recursive: true, force: true });
await cp(source, output, { recursive: true });

const productionHostname = process.env.VERCEL_PROJECT_PRODUCTION_URL;
if (process.env.VERCEL_ENV === 'production' && productionHostname) {
  const { origin } = new URL(`https://${productionHostname}`);
  const entry = new URL('index.html', output);
  const page = await readFile(entry, 'utf8');
  const analyticsOrigin = `<meta name="renmotor-production-origin" content="${origin}">`;
  await writeFile(entry, page.replace('</head>', `${analyticsOrigin}\n</head>`));
}
