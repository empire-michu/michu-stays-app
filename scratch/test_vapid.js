const base64String = 'BDO3OkgwZmVticyOc3vxB-ytVWSyM8XOjPqis7KfyJ5hckPa6qLi8Vvn4-BxcZqUTesZjgVy3dkJ4GwIFQoMc44';
const padding = '='.repeat((4 - base64String.length % 4) % 4);
const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

console.log('Original Length:', base64String.length);
console.log('Padding:', padding);
console.log('Base64 Length:', base64.length);
console.log('Base64 String:', base64);

try {
    const rawData = Buffer.from(base64, 'base64');
    console.log('Decoded Length:', rawData.length);
} catch (e) {
    console.error('FAILED:', e.message);
}
