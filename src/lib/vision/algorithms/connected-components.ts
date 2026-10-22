export interface ConnectedBlobBBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface ConnectedBlob {
  id: number;
  area: number;
  bbox: ConnectedBlobBBox;
  centroid: { x: number; y: number };
  aspectRatio: number;
}

export interface FindConnectedBlobsParams {
  binaryGrid: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
  minArea?: number;
  maxArea?: number;
  isEightConnected?: boolean;
  hasHoleFilling?: boolean;
}

class DisjointSetUnion {
  private readonly parent: Int32Array;

  constructor(maxLabels: number) {
    this.parent = new Int32Array(maxLabels);

    for (let index = 0; index < maxLabels; index += 1) {
      this.parent[index] = index;
    }
  }

  public find(element: number): number {
    let root = element;

    while (this.parent[root] !== root) {
      root = this.parent[root];
    }

    let current = element;

    while (this.parent[current] !== current) {
      const next = this.parent[current];
      this.parent[current] = root;
      current = next;
    }

    return root;
  }

  public union(first: number, second: number): void {
    const rootFirst = this.find(first);
    const rootSecond = this.find(second);

    if (rootFirst !== rootSecond) {
      if (rootFirst < rootSecond) {
        this.parent[rootSecond] = rootFirst;
      } else {
        this.parent[rootFirst] = rootSecond;
      }
    }
  }
}

interface FillHolesParams {
  grid: Uint8Array;
  width: number;
  height: number;
}

function fillGridHoles(params: FillHolesParams): Uint8Array {
  const { grid, width, height } = params;
  const totalPixels = width * height;
  const isVisited = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  let queueHead = 0;
  let queueTail = 0;

  for (let x = 0; x < width; x += 1) {
    const topIdx = x;
    const bottomIdx = (height - 1) * width + x;

    if (grid[topIdx] === 0 && isVisited[topIdx] === 0) {
      isVisited[topIdx] = 1;
      queue[queueTail] = topIdx;
      queueTail += 1;
    }

    if (grid[bottomIdx] === 0 && isVisited[bottomIdx] === 0) {
      isVisited[bottomIdx] = 1;
      queue[queueTail] = bottomIdx;
      queueTail += 1;
    }
  }

  for (let y = 0; y < height; y += 1) {
    const leftIdx = y * width;
    const rightIdx = y * width + (width - 1);

    if (grid[leftIdx] === 0 && isVisited[leftIdx] === 0) {
      isVisited[leftIdx] = 1;
      queue[queueTail] = leftIdx;
      queueTail += 1;
    }

    if (grid[rightIdx] === 0 && isVisited[rightIdx] === 0) {
      isVisited[rightIdx] = 1;
      queue[queueTail] = rightIdx;
      queueTail += 1;
    }
  }

  while (queueHead < queueTail) {
    const currentIdx = queue[queueHead];
    queueHead += 1;

    const currX = currentIdx % width;
    const currY = Math.floor(currentIdx / width);

    const neighbors = [
      currX > 0 ? currentIdx - 1 : -1,
      currX < width - 1 ? currentIdx + 1 : -1,
      currY > 0 ? currentIdx - width : -1,
      currY < height - 1 ? currentIdx + width : -1,
    ];

    for (let i = 0; i < 4; i += 1) {
      const neighborIdx = neighbors[i];

      if (neighborIdx >= 0 && grid[neighborIdx] === 0 && isVisited[neighborIdx] === 0) {
        isVisited[neighborIdx] = 1;
        queue[queueTail] = neighborIdx;
        queueTail += 1;
      }
    }
  }

  const filledGrid = new Uint8Array(grid);

  for (let idx = 0; idx < totalPixels; idx += 1) {
    if (grid[idx] === 0 && isVisited[idx] === 0) {
      filledGrid[idx] = 255;
    }
  }

  return filledGrid;
}

export function findConnectedBlobs(params: FindConnectedBlobsParams): ConnectedBlob[] {
  const {
    binaryGrid,
    width,
    height,
    minArea = 1,
    maxArea = Number.POSITIVE_INFINITY,
    isEightConnected = true,
    hasHoleFilling = false,
  } = params;

  if (width <= 0 || height <= 0 || binaryGrid.length < width * height) {
    return [];
  }

  let workingGrid: Uint8Array | Uint8ClampedArray = binaryGrid;

  if (hasHoleFilling) {
    const copied = new Uint8Array(binaryGrid);
    workingGrid = fillGridHoles({ grid: copied, width, height });
  }

  const totalPixels = width * height;
  const labelMap = new Int32Array(totalPixels);
  const maxPossibleLabels = Math.floor(totalPixels / 2) + 2;
  const dsu = new DisjointSetUnion(maxPossibleLabels);
  let nextLabel = 1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const currentIdx = y * width + x;

      if (workingGrid[currentIdx] === 0) {
        continue;
      }

      const neighborLabels: number[] = [];

      if (x > 0) {
        const leftLabel = labelMap[currentIdx - 1];

        if (leftLabel > 0) {
          neighborLabels.push(leftLabel);
        }
      }

      if (y > 0) {
        const topLabel = labelMap[currentIdx - width];

        if (topLabel > 0) {
          neighborLabels.push(topLabel);
        }

        if (isEightConnected) {
          if (x > 0) {
            const topLeftLabel = labelMap[currentIdx - width - 1];

            if (topLeftLabel > 0) {
              neighborLabels.push(topLeftLabel);
            }
          }

          if (x < width - 1) {
            const topRightLabel = labelMap[currentIdx - width + 1];

            if (topRightLabel > 0) {
              neighborLabels.push(topRightLabel);
            }
          }
        }
      }

      if (neighborLabels.length === 0) {
        if (nextLabel < maxPossibleLabels) {
          labelMap[currentIdx] = nextLabel;
          nextLabel += 1;
        }
      } else {
        let minNeighbor = neighborLabels[0];

        for (let i = 1; i < neighborLabels.length; i += 1) {
          if (neighborLabels[i] < minNeighbor) {
            minNeighbor = neighborLabels[i];
          }
        }

        labelMap[currentIdx] = minNeighbor;

        for (let i = 0; i < neighborLabels.length; i += 1) {
          dsu.union(minNeighbor, neighborLabels[i]);
        }
      }
    }
  }

  interface LabelAccumulator {
    area: number;
    sumX: number;
    sumY: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }

  const blobMap = new Map<number, LabelAccumulator>();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const currentIdx = y * width + x;
      const rawLabel = labelMap[currentIdx];

      if (rawLabel === 0) {
        continue;
      }

      const rootLabel = dsu.find(rawLabel);
      const existing = blobMap.get(rootLabel);

      if (!existing) {
        blobMap.set(rootLabel, {
          area: 1,
          sumX: x,
          sumY: y,
          minX: x,
          minY: y,
          maxX: x,
          maxY: y,
        });
      } else {
        existing.area += 1;
        existing.sumX += x;
        existing.sumY += y;

        if (x < existing.minX) {
          existing.minX = x;
        }

        if (x > existing.maxX) {
          existing.maxX = x;
        }

        if (y < existing.minY) {
          existing.minY = y;
        }

        if (y > existing.maxY) {
          existing.maxY = y;
        }
      }
    }
  }

  const results: ConnectedBlob[] = [];
  let blobCounter = 1;

  for (const [, acc] of blobMap) {
    if (acc.area >= minArea && acc.area <= maxArea) {
      const bWidth = acc.maxX - acc.minX + 1;
      const bHeight = acc.maxY - acc.minY + 1;
      const aspectRatio = bHeight > 0 ? Number((bWidth / bHeight).toFixed(3)) : 1;

      results.push({
        id: blobCounter,
        area: acc.area,
        bbox: {
          minX: acc.minX,
          minY: acc.minY,
          maxX: acc.maxX,
          maxY: acc.maxY,
          width: bWidth,
          height: bHeight,
        },
        centroid: {
          x: Math.round(acc.sumX / acc.area),
          y: Math.round(acc.sumY / acc.area),
        },
        aspectRatio,
      });

      blobCounter += 1;
    }
  }

  results.sort((blobA, blobB) => blobB.area - blobA.area);

  return results;
}
