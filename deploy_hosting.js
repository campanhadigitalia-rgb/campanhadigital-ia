import { execSync } from 'child_process';
import path from 'path';

const keyPath = path.resolve('tmp/firebase-key.json');
const projectId = 'campanha-digital-ia';

console.log('Building project...');
try {
    execSync('npm run build', { stdio: 'inherit', shell: true });
} catch (error) {
    console.error('BUILD FAILED:', error.message);
    process.exit(1);
}

console.log('Deploying to Firebase...');
try {
    execSync(`npx firebase-tools deploy --only hosting,firestore,storage --project ${projectId} --non-interactive`, {
        stdio: 'inherit',
        shell: true,
        env: {
            ...process.env,
            GOOGLE_APPLICATION_CREDENTIALS: keyPath
        }
    });
    console.log('SUCCESS: Deployed to https://campanha-digital-ia.web.app');
} catch (error) {
    console.error('DEPLOY FAILED:', error.message);
    process.exit(1);
}
