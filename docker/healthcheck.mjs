import { get } from 'node:http';

const request = get('http://127.0.0.1:8080/healthz', { timeout: 2000 }, response => {
  let body = '';
  response.setEncoding('utf8');
  response.on('data', chunk => { body += chunk; });
  response.on('end', () => { process.exitCode = response.statusCode === 200 && body === 'ok\n' ? 0 : 1; });
  response.on('error', () => { process.exitCode = 1; });
});
request.on('timeout', () => request.destroy(new Error('Health check timed out')));
request.on('error', () => { process.exitCode = 1; });
