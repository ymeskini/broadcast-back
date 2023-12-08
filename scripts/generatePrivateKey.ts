import { writeFileSync } from 'fs';
import { generateKeyPair, exportPKCS8, exportSPKI } from 'jose';
import { join } from 'path';

const generateKeyPairKeys = async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256', {
    modulusLength: 4096,
  });

  writeFileSync(
    join(process.cwd(), 'scripts', 'private.pem'),
    await exportPKCS8(privateKey),
  );
  writeFileSync(
    join(process.cwd(), 'scripts', 'public.pem'),
    await exportSPKI(publicKey),
  );
};

generateKeyPairKeys();
