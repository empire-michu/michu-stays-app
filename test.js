const vChar = ['v','w'];
const zeros = ['0','O'];
const tChar = ['t','T'];
const kChar = ['k','K'];
const qChar = ['0','O','Q'];

const keys = [];
vChar.forEach(v => {
  zeros.forEach(z1 => {
    zeros.forEach(z2 => {
      zeros.forEach(z3 => {
        tChar.forEach(t => {
          kChar.forEach(k => {
             qChar.forEach(q => {
               keys.push(`AIzaSyA${v}x4GF${z1}ZTaW9${z2}${z3}r${t}NiugGH_a${k}YpVR${q}q4Y`);
             });
          });
        });
      });
    });
  });
});

async function run() {
  console.log(`Testing ${keys.length} permutations...`);
  const chunkSize = 10;
  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    await Promise.all(chunk.map(key => 
      fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({returnSecureToken: true})
      }).then(r => r.json()).then(data => {
        if(data.error?.code !== 400 || data.error?.message !== 'API key not valid. Please pass a valid API key.') {
          console.log('!!!!!!! VALID KEY FOUND !!!!!!!');
          console.log(key);
          console.log(data);
          process.exit(0);
        }
      }).catch(e => {})
    ));
  }
  console.log('Done.');
}
run();
