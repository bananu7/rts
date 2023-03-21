import { GameMap } from './types'
import fs from 'fs'
import PNG from 'pngjs'

export function getMap(path: string): Promise<GameMap> {
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

                  if (b > g)
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
