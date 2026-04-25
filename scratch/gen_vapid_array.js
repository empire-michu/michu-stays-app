const base64 = 'BDO3OkgwZmVticyOc3vxB+ytVWSyM8XOjPqis7KfyJ5hckPa6qLi8Vvn4+BxcZqUTesZjgVy3dkJ4GwIFQoMc44=';
const buffer = Buffer.from(base64, 'base64');
console.log('Uint8Array([' + Array.from(buffer).join(', ') + '])');
