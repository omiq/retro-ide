export class AcornDFSdisc {
    tracks: number;
    files: number;
    image: Uint8Array;
    nextSector: number;

    constructor() {
        this.tracks = 80;
        this.files = 0;
        this.image = new Uint8Array(this.tracks * 10 * 256);
        this.nextSector = 2;

        // Add write method to the image
        (this.image as any).write = function (address: number, d: any, l?: number) {
            if (l) {
                for (let b = 0; b < l; b++) {
                    this.set([d & 0xff], address + b);
                    d >>= 8;
                }
            } else {
                for (let a = 0; a < d.length; a++) {
                    let c = typeof d === "string" ? d.charCodeAt(a) & 0xff : d[a] & 0xff;
                    this.set([c], address + a);
                }
            }
        };

        // Apply Acorn DFS format catalog
        (this.image as any).write(0x0000, "RETRO"); // DFS volume title (8 chars)
        (this.image as any).write(0x0100, "IDE\0");
        (this.image as any).write(0x0104, 0, 1); // BCD catalog cycle number
        (this.image as any).write(0x0105, 0, 1); // Number of files << 3
        (this.image as any).write(0x0106, 0b00110000, 1); // *EXEC boot
        (this.image as any).write(0x0107, 0x2003, 2); // Number of sectors in volume 0x0320
    }

    // Save a file to the disc image
    save(name: string, fileData: string | Uint8Array, loadAdd: number, execAdd: number) {
        // Shift existing catalog up 8 bytes to make room for new entry
        let catalogS0 = this.image.slice(0x008, 0x008 + 8 * 30);
        let catalogS1 = this.image.slice(0x108, 0x108 + 8 * 30);
        (this.image as any).write(0x010, catalogS0);
        (this.image as any).write(0x110, catalogS1);

        // Insert latest catalog entry at the beginning
        (this.image as any).write(0x0008, "       $");
        (this.image as any).write(0x0008, name);
        (this.image as any).write(0x0108, loadAdd, 2); // Load address
        (this.image as any).write(0x010a, execAdd, 2); // Exec address
        (this.image as any).write(0x010c, fileData.length, 2); // Length

        let extra = 0;
        extra |= ((execAdd & 0xffff0000) === (0xffff0000 | 0) ? 3 : 0) << 6;
        extra |= ((fileData.length >> 16) & 3) << 4;
        extra |= ((loadAdd & 0xffff0000) === (0xffff0000 | 0) ? 3 : 0) << 2;
        extra |= ((this.nextSector >> 8) & 3) << 0;
        (this.image as any).write(0x010e, extra, 1);

        (this.image as any).write(0x010f, this.nextSector, 1); // Start sector

        // Write data
        (this.image as any).write(this.nextSector * 0x100, fileData); // Write file data

        // Update disc status
        this.files++;
        this.nextSector = this.nextSector + Math.ceil(fileData.length / 256);
        (this.image as any).write(0x0105, this.files << 3, 1); // Number of files << 3
    }
}
