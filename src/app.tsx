import { useState } from "react";
import initialMatrix from "./initial-data/matrix.json";
import { initialSaints } from "./initial-data/saints";
import { initialZodiacHouses } from "./initial-data/zodiac-houses";
import house from "./assets/house.png";
import type { Matrix } from "./types/matrix";
import type { BronzeSaint } from "./types/bronze-saint";
import type { Point } from "./types/point";
import type { Cell } from "./types/cell";

function App() {
  const [matrix, setMatrix] = useState<Matrix>(initialMatrix);
  const [pathCost, setPathCost] = useState<number>(0);
  const [bronzeSaints, setBronzeSaints] =
    useState<BronzeSaint[]>(initialSaints);
  const [zodiacHouses, setZodiacHouses] = useState(initialZodiacHouses);

  const start: Point = { x: 37, y: 37 };
  const end: Point = { x: 37, y: 4 };

  function calculatePath() {
    const fullPath: Point[] = [];
    let current = start;

    for (const house of zodiacHouses) {
      const segment = aStar(matrix, current, { x: house.x, y: house.y });

      if (!segment) {
        alert(
          `Caminho impossível! (${current.x},${current.y} -> ${house.x},${house.y})`
        );
        return;
      }

      fullPath.push(...segment.slice(1));
      current = { x: house.x, y: house.y };
    }

    const finalSegment = aStar(matrix, current, end);

    if (!finalSegment) {
      alert("Caminho impossível até o fim!");
      return;
    }

    fullPath.push(...finalSegment.slice(1));

    let step = 0;
    let cumulativeCost = 0;
    setPathCost(0);
    const visitedHouses = new Set<string>();

    const interval = setInterval(() => {
      if (step >= fullPath.length) {
        clearInterval(interval);
        return;
      }

      const point = fullPath[step];
      const cell = matrix[point.y][point.x];
      cumulativeCost += cell.minutes;

      const house = zodiacHouses.find(
        (h) => h.x === point.x && h.y === point.y
      );

      if (house) {
        const houseKey = `${house.x},${house.y}`;

        if (!visitedHouses.has(houseKey)) {
          visitedHouses.add(houseKey);

          setBronzeSaints((prevSaints) => {
            const fighters = selectFightersForHouse(
              house.difficulty,
              prevSaints
            );

            if (fighters.length === 0) {
              alert(
                `Não há cavaleiros com energia suficiente antes de ${house.x},${house.y}!`
              );
              clearInterval(interval);
              return prevSaints;
            }

            const totalCosmos = fighters.reduce((acc, s) => acc + s.cosmos, 0);
            const battleTime =
              totalCosmos > 0 ? house.difficulty / totalCosmos : 0;
            cumulativeCost += battleTime;

            return prevSaints.map((s) =>
              fighters.includes(s) && s.energy > 0
                ? { ...s, energy: s.energy - 1 }
                : s
            );
          });
        }
      }

      setPathCost(Math.round(cumulativeCost));

      setMatrix((prev) =>
        prev.map((row, y) =>
          row.map((c, x) => ({
            ...c,
            isPath: c.isPath || (x === point.x && y === point.y),
          }))
        )
      );

      step++;
    }, 50);
  }

  function aStar(matrix: Matrix, start: Point, end: Point): Point[] | null {
    const open: Point[] = [start];
    const cameFrom = new Map<string, Point>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const key = (p: Point) => `${p.x},${p.y}`;
    gScore.set(key(start), 0);
    fScore.set(key(start), manhattan(start, end));

    while (open.length > 0) {
      open.sort(
        (a, b) =>
          (fScore.get(key(a)) ?? Infinity) - (fScore.get(key(b)) ?? Infinity)
      );
      const current = open.shift()!;
      if (current.x === end.x && current.y === end.y)
        return reconstructPath(cameFrom, current);

      for (const neighbor of getNeighbors(matrix, current)) {
        const tentativeG =
          (gScore.get(key(current)) ?? Infinity) +
          matrix[neighbor.y][neighbor.x].minutes;

        if (tentativeG < (gScore.get(key(neighbor)) ?? Infinity)) {
          cameFrom.set(key(neighbor), current);
          gScore.set(key(neighbor), tentativeG);
          fScore.set(key(neighbor), tentativeG + manhattan(neighbor, end));
          if (!open.some((p) => p.x === neighbor.x && p.y === neighbor.y))
            open.push(neighbor);
        }
      }
    }

    return null;
  }

  function selectFightersForHouse(
    houseDifficulty: number,
    bronzeSaints: BronzeSaint[]
  ): BronzeSaint[] {
    const availableSaints = bronzeSaints.filter((s) => s.energy > 0);

    if (availableSaints.length === 0) {
      return [];
    }

    const sortedSaints = [...availableSaints].sort(
      (a, b) => b.cosmos - a.cosmos
    );
    const needed = Math.round((houseDifficulty / 120) * 3);
    const selected = sortedSaints.slice(0, needed);

    return selected;
  }

  function manhattan(a: Point, b: Point) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  function getNeighbors(matrix: Matrix, p: Point) {
    const moves = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    return moves
      .map((m) => ({ x: p.x + m.x, y: p.y + m.y }))
      .filter(
        (n) =>
          n.x >= 0 &&
          n.y >= 0 &&
          n.x < matrix[0].length &&
          n.y < matrix.length &&
          matrix[n.y][n.x].minutes < Infinity
      );
  }

  function reconstructPath(cameFrom: Map<string, Point>, current: Point) {
    const path = [current];
    const key = (p: Point) => `${p.x},${p.y}`;

    while (cameFrom.has(key(current))) {
      current = cameFrom.get(key(current))!;
      path.unshift(current);
    }

    return path;
  }

  function handleCellTerrainChange(cell: Cell) {
    if (cell.isStart || cell.isEnd || cell.difficulty > 0) return;
    cell.minutes = cell.minutes === 1 ? 5 : cell.minutes === 5 ? 200 : 1;
    setMatrix([...matrix]);
  }

  function handleCosmosChange(name: string, value: number) {
    setBronzeSaints((prevSaints) =>
      prevSaints.map((s) => (s.name === name ? { ...s, cosmos: value } : s))
    );
  }

  function handleHouseDifficultyChange(name: string, value: number) {
    setZodiacHouses((prevHouses) =>
      prevHouses.map((h) => (h.name === name ? { ...h, difficulty: value } : h))
    );
  }

  function resetGame() {
    setMatrix(initialMatrix);
    setPathCost(0);
    setBronzeSaints(initialSaints);
    setZodiacHouses(initialZodiacHouses);
  }

  return (
    <div className="flex flex-col items-center mt-10">
      <h1 className="text-white text-2xl mb-4">
        Algoritmo de Busca Heurística A*
      </h1>

      <div className="flex space-x-12">
        <div>
          {matrix.map((line, lineIndex) => (
            <div className="flex" key={lineIndex}>
              {line.map((cell, cellIndex) => {
                const backgroundColor = cell.isEnd
                  ? "bg-green-600"
                  : cell.isStart
                  ? "bg-red-600"
                  : cell.isPath
                  ? "bg-yellow-500"
                  : cell.difficulty > 0
                  ? "bg-gray-300"
                  : cell.minutes === 200
                  ? "bg-gray-800"
                  : cell.minutes === 5
                  ? "bg-gray-500"
                  : "bg-gray-300";

                return (
                  <div
                    className="flex items-center"
                    key={cellIndex}
                    onClick={() => handleCellTerrainChange(cell)}
                  >
                    <div
                      className={`w-[14px] h-[14px] border border-black flex ${backgroundColor}`}
                    >
                      {cell.difficulty > 0 && <img src={house} alt="house" />}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div>
          <div className="text-white mb-4">
            <p className="text-center text-lg">
              Custo total da jornada: <strong>{pathCost} minutos</strong>
            </p>
          </div>

          <div className="text-white mb-4 flex space-x-10">
            <div>
              <h2 className="text-center mb-2 text-lg">Cavaleiros de Bronze</h2>

              <table className="border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-500 px-2 py-1">Nome</th>
                    <th className="border border-gray-500 px-2 py-1">Cosmos</th>
                    <th className="border border-gray-500 px-2 py-1">
                      Energia
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bronzeSaints.map((s) => (
                    <tr key={s.name}>
                      <td className="border border-gray-500 px-2 py-1">
                        {s.name}
                      </td>
                      <td className="border border-gray-500 px-2 py-1">
                        <input
                          type="number"
                          value={s.cosmos}
                          onChange={(e) =>
                            handleCosmosChange(
                              s.name,
                              parseFloat(e.target.value)
                            )
                          }
                          className="bg-gray-700 text-white w-20 text-center"
                        />
                      </td>
                      <td className="border border-gray-500 px-2 py-1">
                        {s.energy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h2 className="text-center mb-2">Casas do Zodíaco</h2>

              <table className="border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-500 px-2 py-1">Casa</th>
                    <th className="border border-gray-500 px-2 py-1">
                      Dificuldade
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {zodiacHouses.map((house) => (
                    <tr key={house.name}>
                      <td className="border border-gray-500 px-2 py-1">
                        {house.name}
                      </td>
                      <td className="border border-gray-500 px-2 py-1">
                        <input
                          type="number"
                          value={house.difficulty}
                          onChange={(e) =>
                            handleHouseDifficultyChange(
                              house.name,
                              parseInt(e.target.value)
                            )
                          }
                          className="bg-gray-700 text-white w-20 text-center"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <button
              onClick={calculatePath}
              className="mb-4 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
            >
              Calcular Melhor Caminho
            </button>

            <button
              onClick={resetGame}
              className="mb-4 px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white ml-2"
            >
              Reiniciar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
