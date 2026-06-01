async function test() {
    const urls = [
        'https://assets.mixkit.co/active_storage/sfx/2867/2867-preview.mp3',
        'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'
    ];
    for (const url of urls) {
        try {
            const res = await fetch(url, { method: 'HEAD' });
            console.log(`${url} -> Status: ${res.status}`);
        } catch(e) {
            console.log(`${url} -> Failed: ${e.message}`);
        }
    }
}
test();
