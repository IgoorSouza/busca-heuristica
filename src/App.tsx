import { useState } from "react";
import matrixJson from "../initial-matrix.json";
import house from "./assets/house.png";

function App() {
  const [matrix, setMatrix] = useState(matrixJson);

  function changeCellMinutes(lineIndex: number, cellIndex: number) {
    const cell = matrix[lineIndex][cellIndex];
    cell.minutes = cell.minutes === 1 ? 5 : cell.minutes === 5 ? 200 : 1;
    const updatedMatrix = [...matrix];
    setMatrix(updatedMatrix);
  }

  return (
    <div className="flex flex-col items-center mt-10">
      <h1 className="text-white text-2xl mb-4">
        Algoritmo de Busca Heurística
      </h1>

      {matrix.map((line, lineIndex) => (
        <div className="flex" key={lineIndex}>
          {line.map((cell, cellIndex) => {
            const backgroundColor = cell.isEnd
              ? "bg-green-600"
              : cell.isBeginning
              ? "bg-red-600"
              : cell.minutes === 200
              ? "bg-gray-800"
              : cell.minutes === 5 || cell.difficulty > 0
              ? "bg-gray-300"
              : "bg-gray-500";

            return (
              <div className="flex items-center" key={cellIndex}>
                <div
                  className={`w-[14px] h-[14px] border border-black flex ${backgroundColor}`}
                  onClick={() => changeCellMinutes(lineIndex, cellIndex)}
                >
                  {cell.difficulty > 0 && <img src={house} alt="house" />}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default App;
