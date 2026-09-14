import { writeFileSync, mkdirSync } from 'fs';

const apiUrl = process.env['NG_APP_API_URL'] || 'https://hub-api.techminds.net.br';

const content = `// Este arquivo é gerado automaticamente pelo script scripts/set-env.mjs durante o build
export const environment = {
  production: true,
  apiUrl: '${apiUrl}',
};
`;

mkdirSync('src/environments', { recursive: true });
writeFileSync('src/environments/environment.prod.ts', content, { encoding: 'utf8' });

console.log(`✅ environment.prod.ts gerado com apiUrl: ${apiUrl}`);
