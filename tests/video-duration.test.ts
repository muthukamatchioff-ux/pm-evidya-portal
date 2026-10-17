import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Unit tests for video duration logic & formatters
function parseMp4DurationFromBuffer(buffer: Buffer): number | null {
  let offset = 0;
  while (offset < buffer.length - 8) {
    const size = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (size === 0) break;
    const atomSize = size === 1 ? Number(buffer.readBigUInt64BE(offset + 8)) : size;
    
    if (type === 'moov') {
      let subOffset = offset + (size === 1 ? 16 : 8);
      const subEnd = Math.min(offset + atomSize, buffer.length);
      while (subOffset < subEnd - 8) {
        const subSize = buffer.readUInt32BE(subOffset);
        const subType = buffer.toString('ascii', subOffset + 4, subOffset + 8);
        if (subSize <= 0) break;
        if (subType === 'mvhd') {
          const version = buffer.readUInt8(subOffset + 8);
          let timescale: number, duration: number;
          if (version === 0) {
            timescale = buffer.readUInt32BE(subOffset + 20);
            duration = buffer.readUInt32BE(subOffset + 24);
          } else if (version === 1) {
            timescale = buffer.readUInt32BE(subOffset + 28);
            duration = Number(buffer.readBigUInt64BE(subOffset + 32));
          } else {
            break;
          }
          if (timescale && duration && timescale > 0) {
            return duration / timescale;
          }
        }
        subOffset += subSize;
      }
    }
    offset += atomSize;
  }
  return null;
}

function formatDurationString(seconds: number): string {
  const s = Math.round(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

describe('PM e-Vidya Portal — Final Deliverable & Duration Detection Verification', () => {
  it('should format seconds into MM:SS correctly', () => {
    expect(formatDurationString(65)).toBe('01:05');
    expect(formatDurationString(125)).toBe('02:05');
    expect(formatDurationString(479)).toBe('07:59');
    expect(formatDurationString(0)).toBe('00:00');
  });

  it('should format seconds into HH:MM:SS when duration exceeds 1 hour', () => {
    expect(formatDurationString(3600)).toBe('01:00:00');
    expect(formatDurationString(6463)).toBe('01:47:43');
    expect(formatDurationString(3763)).toBe('01:02:43');
  });

  it('should parse ISO-BMFF MP4 mvhd duration correctly from raw buffer', () => {
    // Construct test MP4 buffer with mvhd v0
    const mvhd = Buffer.alloc(108);
    mvhd.writeUInt32BE(108, 0);
    mvhd.write('mvhd', 4, 4, 'ascii');
    mvhd.writeUInt8(0, 8); // v0
    mvhd.writeUInt32BE(1000, 20); // timescale = 1000
    mvhd.writeUInt32BE(185000, 24); // duration = 185,000 (185 sec = 03:05)

    const moov = Buffer.alloc(116);
    moov.writeUInt32BE(116, 0);
    moov.write('moov', 4, 4, 'ascii');
    mvhd.copy(moov, 8);

    const ftyp = Buffer.alloc(20);
    ftyp.writeUInt32BE(20, 0);
    ftyp.write('ftyp', 4, 4, 'ascii');

    const fileBuffer = Buffer.concat([ftyp, moov]);
    const detectedSeconds = parseMp4DurationFromBuffer(fileBuffer);
    expect(detectedSeconds).toBe(185);
    expect(formatDurationString(detectedSeconds!)).toBe('03:05');
  });

  it('should handle corrupted or truncated MP4 buffers without throwing', () => {
    const corruptBuffer = Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]);
    const detected = parseMp4DurationFromBuffer(corruptBuffer);
    expect(detected).toBeNull();
  });
});
