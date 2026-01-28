import * as vimModule from '@replit/codemirror-vim';
console.log('Exports:', Object.keys(vimModule));
if (vimModule.vim) console.log('vim export:', typeof vimModule.vim);
if (vimModule.Vim) console.log('Vim export:', typeof vimModule.Vim);
if (vimModule.getCM) console.log('getCM export:', typeof vimModule.getCM);
