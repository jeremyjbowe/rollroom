import {createInterface} from 'node:readline';
import {hashPassword} from '../lib/password.ts';
// Accept via stdin to avoid putting passwords in process arguments/history.
if(process.stdin.isTTY){console.error('Pipe a password from your password manager into this command. Minimum 16 characters.');process.exit(1);}
let input='';for await(const chunk of process.stdin)input+=chunk;console.log(await hashPassword(input.trimEnd()));
