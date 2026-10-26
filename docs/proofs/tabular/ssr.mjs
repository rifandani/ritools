// Prove that a mount gate does not evaluate either DOM-only grid at SSR time.
import { createRequire } from 'node:module';
const requireWeb = createRequire(`${process.cwd()}/apps/web/package.json`);
const React = requireWeb('react');
const { renderToString } = requireWeb('react-dom/server');
let imports = 0;
const DeferredGrid = React.lazy(() => { imports++; throw new Error('DOM-only module evaluated on server'); });
function ClientGrid() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted ? React.createElement(DeferredGrid) : React.createElement('p', {role:'status'}, 'Open a Table File');
}
const markup=renderToString(React.createElement(ClientGrid));
if(imports!==0 || !markup.includes('Open a Table File')) throw new Error('SSR guard failed');
console.log(JSON.stringify({react:React.version,imports,markup,pass:true}));
