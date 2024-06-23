import { GameMap } from './types'
import fs from 'fs'
import PNG from 'pngjs'

type Symmetry = "mirror_x" | "mirror_y" | "mirror_xy" | "none";

const mapPathPrefix = "assets/";

export async function getMap(path: string): Promise<GameMap> {
    const mapMetadata = JSON.parse(fs.readFileSync(path, 'utf8'));
    const gm = await getMapImageData(mapPathPrefix + mapMetadata.imagePath);

    if (gm.w !== mapMetadata.w || gm.h !== mapMetadata.h) {
        throw new Error("Map image size different than declared");
    }

    if (!checkSymmetry(gm, mapMetadata.symmetry)) {
        throw new Error("Map is not symmetric according to spec");
    }

    return gm;
}

function checkSymmetry(gm: GameMap, symmetry: Symmetry): boolean {
    // TODO
    return true;
}

export async function getMapImageData(path: string): Promise<GameMap> {
    return new Promise((resolve, reject) => {
        fs.createReadStream(path)
        .pipe(new PNG.PNG())
        .on('parsed', function() {
            const tiles = [] as number[];

            for (var y = 0; y < this.height; y++) {
              for (var x = 0; x < this.width; x++) {
                  var idx = (this.width * y + x) << 2;

                  const r = this.data[idx];
                  const g = this.data[idx+1];
                  const b = this.data[idx+2];
                  const a = this.data[idx+3];

                  if (b > (r+g))
                      tiles.push(2);
                  else if (b > g)
                      tiles.push(1);
                  else
                      tiles.push(0);
              }
            }

            //this.pack().pipe(fs.createWriteStream('out.png'));
            resolve({
                w: this.width,
                h: this.height,
                tiles
            });
        });
    });
}
