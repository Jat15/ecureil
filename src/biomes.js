export const BIOME_COLORS = {
  glacier:  { low: 0xc8d8e4, mid: 0xe0eaf2, high: 0xf4f8fc },
  tempere:  { low: 0x2f5f52, mid: 0x4f8f4a, high: 0x86a85a },
  tropical: { low: 0x1a6b2a, mid: 0x3e9c3a, high: 0x7cc84a },
  desert:   { low: 0xb89058, mid: 0xd4b880, high: 0xe8d0a0 },
  marais:   { low: 0x2a3520, mid: 0x3a4a28, high: 0x4a5a30 }
};

export const BIOME_LABELS = {
  glacier: 'Glacier',
  tempere: 'Forêt tempérée',
  tropical: 'Tropiques',
  desert: 'Désert',
  marais: 'Marais'
};

export function getBiomeId(dir, elev = 0.5) {
  const lat = Math.abs(dir.y);
  const n1 = Math.sin(dir.x * 3.7 + 1.2) * Math.cos(dir.z * 2.9 + 0.8);
  const n2 = Math.sin(dir.x * 5.3 - dir.z * 4.1 + 0.5) * 0.4;
  const humid = (n1 + n2) * 0.5 + 0.5;
  if (elev > 0.85) return 'glacier';
  if (lat > 0.72) return 'glacier';
  const temp = 1 - lat;
  if (temp < 0.35) return 'glacier';
  if (temp < 0.55) return humid > 0.42 ? 'tempere' : 'marais';
  if (humid > 0.58) return 'tropical';
  if (humid < 0.38) return 'desert';
  return 'tempere';
}
